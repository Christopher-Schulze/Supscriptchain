import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Creates a new subscription plan on an existing Subscription contract.
 *
 * Example:
 * npx hardhat create-plan --network hardhat \
 *   --subscription 0xSUB --merchant 0xMERCHANT --token 0xTOKEN \
 *   --price 1000 --billing-cycle 3600 --price-in-usd \
 *   --usd-price 999 --price-feed 0xFEED
 */

task('create-plan', 'Create a new subscription plan')
  .addOptionalParam('subscription', 'Subscription contract address')
  .addOptionalParam('merchant', 'Merchant address')
  .addOptionalParam('token', 'ERC20 token address')
  .addOptionalParam('price', 'Token price', undefined, types.string)
  .addOptionalParam('billingCycle', 'Billing cycle in seconds', undefined, types.string)
  .addFlag('priceInUsd', 'Price denominated in USD')
  .addOptionalParam('usdPrice', 'USD price (cents)', undefined, types.string)
  .addOptionalParam('priceFeed', 'Chainlink price feed address')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const [signer] = await hre.ethers.getSigners();
    const merchant = args.merchant ?? process.env.MERCHANT_ADDRESS ?? signer.address;
    const token = args.token ?? process.env.TOKEN_ADDRESS;
    if (!token) throw new Error('token address missing');
    const price = args.price ?? process.env.FIXED_PRICE ?? '0';
    const billingCycle = BigInt(args.billingCycle ?? process.env.BILLING_CYCLE ?? '0');
    const priceInUsd = args.priceInUsd ? true : process.env.PRICE_IN_USD === 'true';
    const usdPrice = BigInt(args.usdPrice ?? process.env.USD_PRICE ?? '0');
    const priceFeed = args.priceFeed ?? process.env.PRICE_FEED ?? hre.ethers.ZeroAddress;

    const contract = await hre.ethers.getContractAt(
      'SubscriptionUpgradeable',
      subscription,
      signer,
    );

    const tx = await contract.createPlan(
      merchant,
      token,
      price,
      billingCycle,
      priceInUsd,
      usdPrice,
      priceFeed,
    );
    await tx.wait();
    console.log(`Plan created with tx ${tx.hash}`);
  });

export {};
