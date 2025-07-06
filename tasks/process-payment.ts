import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Processes a subscription payment for the given user and plan.
 *
 * Example:
 * npx hardhat process-payment --network hardhat \
 *   --subscription 0xSUB --user 0xUSER --plan-id 0
 */

task('process-payment', 'Process a subscription payment')
  .addOptionalParam('subscription', 'Subscription contract address')
  .addOptionalParam('user', 'Subscriber address')
  .addOptionalParam('planId', 'Plan ID', undefined, types.string)
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const user = args.user;
    if (!user) throw new Error('user address missing');
    const planId = BigInt(args.planId ?? process.env.PLAN_ID ?? '0');
    const [signer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt(
      'SubscriptionUpgradeable',
      subscription,
      signer,
    );
    const tx = await contract.processPayment(user, planId);
    await tx.wait();
    console.log(
      `Processed payment for ${user} plan ${planId} with tx ${tx.hash}`,
    );
  });

export {};
