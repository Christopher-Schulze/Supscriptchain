import { ethers, upgrades } from 'hardhat';
import { loadEnv } from './env';

async function main() {
  const env = loadEnv();
  const merchant = env.MERCHANT_ADDRESS || ethers.constants.AddressZero;
  const token = env.TOKEN_ADDRESS || ethers.constants.AddressZero;
  const priceFeed = env.PRICE_FEED || ethers.constants.AddressZero;
  const billingCycle = parseInt(env.BILLING_CYCLE || '2592000', 10);
  const priceInUsd = env.PRICE_IN_USD === 'true';
  const fixedPrice = env.FIXED_PRICE || '0';
  const usdPrice = parseInt(env.USD_PRICE || '0', 10);

  const [deployer] = await ethers.getSigners();
  const SubscriptionFactory = await ethers.getContractFactory(
    'SubscriptionUpgradeable',
  );
  const subscription = await upgrades.deployProxy(
    SubscriptionFactory,
    [deployer.address],
    {
      initializer: 'initialize',
    },
  );
  await subscription.waitForDeployment();
  console.log(
    'Subscription proxy deployed to:',
    await subscription.getAddress(),
  );

  if (token !== ethers.constants.AddressZero) {
    const tx = await subscription.createPlan(
      merchant,
      token,
      fixedPrice,
      billingCycle,
      priceInUsd,
      usdPrice,
      priceFeed,
    );
    await tx.wait();
    console.log('Initial plan created');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
