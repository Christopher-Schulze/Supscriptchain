import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Prints status information about the subscription contract.
 *
 * Example:
 * npx hardhat status --network hardhat --subscription 0xSUB
 */

task('status', 'Show subscription contract status')
  .addOptionalParam('subscription', 'Subscription contract address')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const [signer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt('SubscriptionUpgradeable', subscription, signer);
    const paused = await contract.paused();
    const nextId: bigint = await contract.nextPlanId();
    const active: string[] = [];
    const inactive: string[] = [];
    for (let i = 0n; i < nextId; i++) {
      const plan = await contract.plans(i);
      (plan.active ? active : inactive).push(i.toString());
    }
    const info = {
      paused,
      nextPlanId: nextId.toString(),
      activePlans: active,
      inactivePlans: inactive,
    };
    console.log(JSON.stringify(info, null, 2));
  });

export {};
