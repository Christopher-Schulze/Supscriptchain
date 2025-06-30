import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

interface SubscriberEntry {
  user: string;
  plans: number[];
}

async function main() {
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
  const subscribers: SubscriberEntry[] = Array.isArray(raw)
    ? raw.map((entry: any) => {
        if (typeof entry === 'string') {
          return { user: entry, plans: [defaultPlanId] } as SubscriberEntry;
        }
        return {
          user: entry.user,
          plans: Array.isArray(entry.plan)
            ? entry.plan.map((p: any) => Number(p))
            : [Number(entry.plan ?? defaultPlanId)],
        } as SubscriberEntry;
      })
    : [];

  const now = Math.floor(Date.now() / 1000);

  for (const { user, plans } of subscribers) {
    for (const plan of plans) {
      try {
        const sub = await subscription.userSubscriptions(user, plan);
        if (sub.isActive && sub.nextPaymentDate.toNumber() <= now) {
          const tx = await subscription.processPayment(user, plan);
          await tx.wait();
          console.log(`Processed payment for ${user} plan ${plan}`);
        }
      } catch (err) {
        console.error(
          `Failed to process payment for ${user} plan ${plan}:`,
          err,
        );
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
