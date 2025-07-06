import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import http from 'http';
import pLimit from 'p-limit';
import yaml from 'js-yaml';
import { loadEnv } from './env';
import { createLogger, LogFn, LogLevel } from './log';
import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

let configPath: string | undefined;
const argIdx = process.argv.indexOf('--config');
if (argIdx !== -1 && process.argv[argIdx + 1]) {
  configPath = process.argv[argIdx + 1];
} else if (process.env.PAYMENT_CONFIG) {
  configPath = process.env.PAYMENT_CONFIG;
}

const daemon = process.argv.includes('--daemon');

if (configPath) {
  const resolved = path.resolve(configPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  let parsed: any;
  try {
    if (resolved.endsWith('.yaml') || resolved.endsWith('.yml')) {
      parsed = yaml.load(raw);
    } else {
      parsed = JSON.parse(raw);
    }
  } catch (err) {
    throw new Error(`Failed to parse config file ${resolved}: ${err}`);
  }
  if (parsed && typeof parsed === 'object') {
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== undefined) {
        process.env[k] = String(v);
      }
    }
  }
}

const env = loadEnv();

const metricsPort = env.METRICS_PORT ? parseInt(env.METRICS_PORT, 10) : 0;
let register: Registry | null = null;
let successCounter: Counter | null = null;
let failureCounter: Counter | null = null;

// When `METRICS_PORT` is set, expose Prometheus metrics.
// The following metrics are registered:
// - `payment_success_total{plan_id}`: number of successful payments
// - `payment_failure_total{plan_id}`: number of failed payments
// Default metrics from `prom-client` are also collected.
if (metricsPort) {
  register = new Registry();
  collectDefaultMetrics({ register });
  // Expose per-plan success and failure counters for Prometheus
  successCounter = new Counter({
    name: 'payment_success_total',
    help: 'Total number of successful payments per plan',
    labelNames: ['plan_id'],
    registers: [register],
  });
  failureCounter = new Counter({
    name: 'payment_failure_total',
    help: 'Total number of failed payments per plan',
    labelNames: ['plan_id'],
    registers: [register],
  });
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register!.contentType);
      res.end(await register!.metrics());
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
  server.listen(metricsPort, () => {
    console.log(`Metrics server listening on port ${metricsPort}`);
  });
}

/**
 * Parsed subscriber entry from JSON.
 * The input can be a list of strings or objects with either a `plan`
 * or `plans` field. Each accepts a single number, an array of numbers
 * or even a comma separated string. Duplicates are removed.
 */
interface SubscriberEntry {
  user: string;
  plans: number[];
}

// Cache subscribers between runs when CACHE_SUBSCRIBERS=true.
// This avoids repeatedly reading the JSON file during INTERVAL mode.
let subscriberCache: SubscriberEntry[] | null = null;

interface FailedPayment {
  user: string;
  plan: number;
  reason: string;
}

async function notifyFailure(failure: FailedPayment, log: LogFn) {
  const url = env.NOTIFY_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(failure),
    });
    log(
      'info',
      `Sent failure notification for ${failure.user} plan ${failure.plan}`,
    );
  } catch (err) {
    log(
      'error',
      `Failed to send failure notification: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function runOnce(log: LogFn) {
  const failOnFailure =
    env.FAIL_ON_FAILURE === 'true' || env.FAIL_ON_FAILURE === '1';
  const dryRun = env.DRY_RUN === 'true' || env.DRY_RUN === '1';
  const failures: FailedPayment[] = [];
  const contractAddress = env.SUBSCRIPTION_ADDRESS;
  if (!contractAddress) {
    throw new Error('SUBSCRIPTION_ADDRESS not set');
  }
  const defaultPlanId = parseInt(env.PLAN_ID || '0', 10);
  const listPath =
    env.SUBSCRIBERS_FILE || path.join(__dirname, 'subscribers.json');

  const provider = ethers.provider;
  const merchantPk = env.MERCHANT_PRIVATE_KEY;
  const signer = merchantPk
    ? new ethers.Wallet(merchantPk, provider)
    : (await ethers.getSigners())[0];
  const subscription = await ethers.getContractAt(
    'Subscription',
    contractAddress,
    signer,
  );

  let subscribers: SubscriberEntry[];
  if (env.CACHE_SUBSCRIBERS === 'true' && subscriberCache) {
    // Reuse previously parsed subscribers when caching is enabled
    subscribers = subscriberCache;
  } else {
    const raw = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    const parsed: SubscriberEntry[] = [];

    if (Array.isArray(raw)) {
      for (const entry of raw) {
        let user: string;
        let planField: any;

        if (typeof entry === 'string') {
          user = entry;
          planField = [defaultPlanId];
        } else {
          user = entry.user;
          planField = entry.plans ?? entry.plan ?? defaultPlanId;
        }

        const planArray = Array.isArray(planField)
          ? planField
          : String(planField)
              .split(',')
              .map((p: string) => p.trim())
              .filter((p: string) => p !== '');

        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          log('error', `Invalid address ${user}, skipping entry`);
          continue;
        }

        const plans = [...new Set(planArray.map((p: any) => Number(p)))].filter(
          (p) => !Number.isNaN(p) && p >= 0,
        );

        if (plans.length === 0) {
          log('error', `No valid plan IDs for ${user}, skipping entry`);
          continue;
        }

        parsed.push({ user, plans });
      }
    }

    subscribers = parsed;
    if (env.CACHE_SUBSCRIBERS === 'true') {
      subscriberCache = subscribers;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const concurrency = Math.max(parseInt(env.MAX_CONCURRENCY || '1', 10), 1);
  const limit = pLimit(concurrency);
  const maxRetries = Math.max(parseInt(env.MAX_RETRIES || '1', 10), 1);
  const baseDelay = Math.max(parseInt(env.RETRY_BASE_DELAY_MS || '500', 10), 0);
  const failuresFile = env.FAILURES_FILE;

  async function processWithRetry(user: string, plan: number) {
    if (dryRun) {
      log('info', `[DRY_RUN] would process payment for ${user} plan ${plan}`);
      return;
    }
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log(
          'info',
          `Processing payment for ${user} plan ${plan} (attempt ${attempt})`,
        );
        const tx = await subscription.processPayment(user, plan);
        await tx.wait();
        log('info', `Processed payment for ${user} plan ${plan}`);
        successCounter?.inc({ plan_id: String(plan) });
        return;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        if (attempt < maxRetries) {
          const delay = baseDelay * 2 ** (attempt - 1);
          log(
            'warn',
            `Attempt ${attempt} failed for ${user} plan ${plan}: ${reason}, retrying in ${delay}ms`,
          );
          await new Promise((res) => setTimeout(res, delay));
        } else {
          failures.push({ user, plan, reason });
          log(
            'error',
            `Failed to process payment for user ${user} plan ${plan}: ${reason}`,
          );
          failureCounter?.inc({ plan_id: String(plan) });
          await notifyFailure({ user, plan, reason }, log);
        }
      }
    }
  }
  const tasks: Promise<void>[] = [];

  for (const { user, plans } of subscribers) {
    for (const plan of plans) {
      tasks.push(
        limit(async () => {
          try {
            const sub = await subscription.userSubscriptions(user, plan);
            if (sub.isActive && sub.nextPaymentDate.toNumber() <= now) {
              await processWithRetry(user, plan);
            }
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            failures.push({ user, plan, reason });
            log(
              'error',
              `Failed to retrieve subscription for user ${user} plan ${plan}: ${reason}`,
            );
            failureCounter?.inc({ plan_id: String(plan) });
          }
        }),
      );
    }
  }
  await Promise.all(tasks);

  if (failures.length > 0) {
    log('info', '\nFailed payments summary:');
    for (const f of failures) {
      log('info', `- ${f.user} plan ${f.plan}: ${f.reason}`);
    }
    if (failuresFile) {
      fs.writeFileSync(failuresFile, JSON.stringify(failures, null, 2));
      log('info', `Wrote failures to ${failuresFile}`);
    }
    if (failOnFailure) {
      process.exit(1);
    } else {
      process.exitCode = 1;
    }
  }
}

async function runDaemon(log: LogFn, interval: number) {
  let stop = false;
  function handle(sig: NodeJS.Signals) {
    log('info', `Received ${sig}, shutting down...`);
    stop = true;
  }
  process.once('SIGINT', handle);
  process.once('SIGTERM', handle);

  while (!stop) {
    await runOnce(log);
    if (stop) break;
    if (interval > 0) {
      await new Promise((res) => setTimeout(res, interval * 1000));
    }
  }
}

async function main() {
  const logFile = env.LOG_FILE;
  const lokiUrl = env.LOKI_URL;
  const logLevel = (env.LOG_LEVEL as LogLevel) || 'info';
  const log = createLogger({ logFile, lokiUrl, logLevel });
  const interval = parseInt(env.INTERVAL || '0', 10);
  if (daemon) {
    await runDaemon(log, interval);
  } else if (interval > 0) {
    while (true) {
      await runOnce(log);
      await new Promise((res) => setTimeout(res, interval * 1000));
    }
  } else {
    await runOnce(log);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
