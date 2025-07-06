import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Cancels an active subscription.
 *
 * Example:
 * npx hardhat cancel --network hardhat --subscription 0xSUB --plan-id 0
 */

task('cancel', 'Cancel an active subscription')
  .addOptionalParam('subscription', 'Subscription contract address')
  .addOptionalParam('planId', 'Plan ID', undefined, types.string)
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const planId = BigInt(args.planId ?? process.env.PLAN_ID ?? '0');
    const [signer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt(
      'SubscriptionUpgradeable',
      subscription,
      signer,
    );
    const tx = await contract.cancelSubscription(planId);
    await tx.wait();
    console.log(`Subscription ${planId} cancelled with tx ${tx.hash}`);
  });

export {};
