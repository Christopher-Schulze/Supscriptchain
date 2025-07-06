import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Lists all subscriptions for a given user.
 *
 * Example:
 * npx hardhat list-subs --network hardhat --subscription 0xSUB --user 0xUSER
 */

task('list-subs', 'List subscriptions for a user')
  .addOptionalParam('subscription', 'Subscription contract address')
  .addOptionalParam('user', 'User address')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const [signer] = await hre.ethers.getSigners();
    const user = args.user ?? signer.address;
    const contract = await hre.ethers.getContractAt(
      'SubscriptionUpgradeable',
      subscription,
      signer,
    );
    const nextId: bigint = await contract.nextPlanId();
    const result: any[] = [];
    for (let i = 0n; i < nextId; i++) {
      const s = await contract.userSubscriptions(user, i);
      if (s.subscriber !== hre.ethers.ZeroAddress || s.isActive) {
        result.push({
          planId: i.toString(),
          subscriber: s.subscriber,
          startTime: s.startTime.toString(),
          nextPaymentDate: s.nextPaymentDate.toString(),
          isActive: s.isActive,
        });
      }
    }
    console.log(JSON.stringify(result, null, 2));
  });

export {};
