import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import util from 'util';
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

async function runOnce(log: (...args: any[]) => void) {
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
        console.error(`Invalid address ${user}, skipping entry`);
        continue;
      }

      const plans = [...new Set(planArray.map((p: any) => Number(p)))]
        .filter((p) => !Number.isNaN(p) && p >= 0);

      if (plans.length === 0) {
        console.error(`No valid plan IDs for ${user}, skipping entry`);
        continue;
      }

      subscribers.push({ user, plans });
    }
  }

  const now = Math.floor(Date.now() / 1000);

  for (const { user, plans } of subscribers) {
    for (const plan of plans) {
      try {
        const sub = await subscription.userSubscriptions(user, plan);
        if (sub.isActive && sub.nextPaymentDate.toNumber() <= now) {
          console.log(`Processing payment for ${user} plan ${plan}`);
          const tx = await subscription.processPayment(user, plan);
          await tx.wait();
          console.log(`Processed payment for ${user} plan ${plan}`);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ user, plan, reason });
        console.error(
          `Failed to process payment for user ${user} plan ${plan}:`,
          reason,
        );
      }
    }
  }

  if (failures.length > 0) {
    log('\nFailed payments summary:');
    for (const f of failures) {
      log(`- ${f.user} plan ${f.plan}: ${f.reason}`);
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
  const log = logFile
    ? (...args: any[]) =>
        fs.appendFileSync(logFile, util.format(...args) + '\n')
    : console.log;
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
