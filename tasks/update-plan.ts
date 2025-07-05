import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Updates an existing subscription plan.
 *
 * Example:
 * npx hardhat update-plan --network hardhat \
 *   --subscription 0xSUB --plan-id 0 --billing-cycle 7200 \
 *   --price 2000 --price-in-usd --usd-price 999 --price-feed 0xFEED
 */

task('update-plan', 'Update an existing subscription plan')
  .addOptionalParam('subscription', 'Subscription contract address')
  .addOptionalParam('planId', 'Plan ID', undefined, types.string)
  .addOptionalParam('billingCycle', 'Billing cycle in seconds', undefined, types.string)
  .addOptionalParam('price', 'Token price', undefined, types.string)
  .addFlag('priceInUsd', 'Price denominated in USD')
  .addOptionalParam('usdPrice', 'USD price (cents)', undefined, types.string)
  .addOptionalParam('priceFeed', 'Chainlink price feed address')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const planId = BigInt(args.planId ?? process.env.PLAN_ID ?? '0');
    const billingCycle = BigInt(args.billingCycle ?? process.env.BILLING_CYCLE ?? '0');
    const price = args.price ?? process.env.FIXED_PRICE ?? '0';
    const priceInUsd = args.priceInUsd ? true : process.env.PRICE_IN_USD === 'true';
    const usdPrice = BigInt(args.usdPrice ?? process.env.USD_PRICE ?? '0');
    const priceFeed = args.priceFeed ?? process.env.PRICE_FEED ?? hre.ethers.ZeroAddress;
    const [signer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt('SubscriptionUpgradeable', subscription, signer);
    const tx = await contract.updatePlan(planId, billingCycle, price, priceInUsd, usdPrice, priceFeed);
    await tx.wait();
    console.log(`Plan ${planId} updated with tx ${tx.hash}`);
  });

export {};
