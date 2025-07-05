import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Updates the merchant address for a subscription plan.
 *
 * Example:
 * npx hardhat update-merchant --network hardhat --subscription 0xSUB --plan-id 0 --merchant 0xNEW
 */

task('update-merchant', 'Update the merchant of a subscription plan')
  .addOptionalParam('subscription', 'Subscription contract address')
  .addOptionalParam('planId', 'Plan ID', undefined, types.string)
  .addOptionalParam('merchant', 'New merchant address')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const planId = BigInt(args.planId ?? process.env.PLAN_ID ?? '0');
    const merchant = args.merchant ?? process.env.MERCHANT_ADDRESS;
    if (!merchant) throw new Error('merchant address missing');
    const [signer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt('SubscriptionUpgradeable', subscription, signer);
    const tx = await contract.updateMerchant(planId, merchant);
    await tx.wait();
    console.log(`Merchant for plan ${planId} updated with tx ${tx.hash}`);
  });

export {};
