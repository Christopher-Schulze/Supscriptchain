import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import util from 'util';
import pLimit from 'p-limit';
import pino from 'pino';
import { checkEnv } from './check-env';

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

interface FailedPayment {
  user: string;
  plan: number;
  reason: string;
}

type LogLevel = 'info' | 'error' | 'warn';

type LogFn = (level: LogLevel, ...args: any[]) => void;

async function notifyFailure(failure: FailedPayment, log: LogFn) {
  const url = process.env.NOTIFY_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(failure),
    });
    log('info', `Sent failure notification for ${failure.user} plan ${failure.plan}`);
  } catch (err) {
    log(
      'error',
      `Failed to send failure notification: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function runOnce(log: LogFn) {
  const failOnFailure =
    process.env.FAIL_ON_FAILURE === 'true' ||
    process.env.FAIL_ON_FAILURE === '1';
  const failures: FailedPayment[] = [];
  const contractAddress = process.env.SUBSCRIPTION_ADDRESS;
  if (!contractAddress) {
    throw new Error('SUBSCRIPTION_ADDRESS not set');
  }
  const defaultPlanId = parseInt(process.env.PLAN_ID || '0', 10);
  const listPath =
    process.env.SUBSCRIBERS_FILE || path.join(__dirname, 'subscribers.json');

  const provider = ethers.provider;
  const merchantPk = process.env.MERCHANT_PRIVATE_KEY;
  const signer = merchantPk
    ? new ethers.Wallet(merchantPk, provider)
    : (await ethers.getSigners())[0];
  const subscription = await ethers.getContractAt(
    'Subscription',
    contractAddress,
    signer,
  );

  const raw = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  const subscribers: SubscriberEntry[] = [];

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

      subscribers.push({ user, plans });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const concurrency = Math.max(
    parseInt(process.env.MAX_CONCURRENCY || '1', 10),
    1,
  );
  const limit = pLimit(concurrency);
  const maxRetries = Math.max(parseInt(process.env.MAX_RETRIES || '1', 10), 1);
  const baseDelay = Math.max(
    parseInt(process.env.RETRY_BASE_DELAY_MS || '500', 10),
    0,
  );
  const failuresFile = process.env.FAILURES_FILE;

  async function processWithRetry(user: string, plan: number) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log('info', `Processing payment for ${user} plan ${plan} (attempt ${attempt})`);
        const tx = await subscription.processPayment(user, plan);
        await tx.wait();
        log('info', `Processed payment for ${user} plan ${plan}`);
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

async function main() {
  checkEnv();
  const logFile = process.env.LOG_FILE;
  const lokiUrl = process.env.LOKI_URL;
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  let lokiLogger: pino.Logger | null = null;
  if (lokiUrl) {
    const transport = pino.transport({
      targets: [
        {
          target: 'pino-loki',
          options: { host: lokiUrl },
          level: 'info',
        },
      ],
    });
    lokiLogger = pino(transport);
  }

  const levels: LogLevel[] = ['error', 'warn', 'info'];
  const levelIdx = levels.indexOf(logLevel);
  const log: LogFn = (level, ...args) => {
    if (levels.indexOf(level) > levelIdx) return;
    const msg = util.format(...args);
    if (level === 'error') {
      console.error(msg);
    } else if (level === 'warn') {
      console.warn(msg);
    } else {
      console.log(msg);
    }
    if (logFile) {
      fs.appendFileSync(logFile, msg + '\n');
    }
    lokiLogger?.[level](msg);
  };
  const interval = parseInt(process.env.INTERVAL || '0', 10);
  if (interval > 0) {
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
