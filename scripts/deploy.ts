import { ethers, upgrades, network } from 'hardhat';
import { spawnSync } from 'child_process';
import path from 'path';
import { loadEnv } from './env';

async function main() {
  const env = loadEnv();
  if (!env.MERCHANT_ADDRESS) {
    console.error('MERCHANT_ADDRESS not set, using zero address');
  }
  const merchant = env.MERCHANT_ADDRESS || ethers.constants.AddressZero;
  if (!env.TOKEN_ADDRESS) {
    console.error('TOKEN_ADDRESS not set, using zero address');
  }
  const token = env.TOKEN_ADDRESS || ethers.constants.AddressZero;
  if (!env.PRICE_FEED) {
    console.error('PRICE_FEED not set, using zero address');
  }
  const priceFeed = env.PRICE_FEED || ethers.constants.AddressZero;
  if (!env.BILLING_CYCLE) {
    console.error('BILLING_CYCLE not set, using default 2592000');
  }
  const billingCycle = parseInt(env.BILLING_CYCLE || '2592000', 10);
  if (!env.PRICE_IN_USD) {
    console.error('PRICE_IN_USD not set, defaulting to false');
  }
  const priceInUsd = env.PRICE_IN_USD === 'true';
  if (!env.FIXED_PRICE) {
    console.error('FIXED_PRICE not set, using 0');
  }
  const fixedPrice = env.FIXED_PRICE || '0';
  if (!env.USD_PRICE) {
    console.error('USD_PRICE not set, using 0');
  }
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

  const net = process.env.NETWORK || process.env.HARDHAT_NETWORK || network.name;
  const addr = await subscription.getAddress();
  const childEnv = { ...process.env, NETWORK: net, CONTRACT_ADDRESS: addr };
  const script = path.join(__dirname, 'prepare-subgraph.ts');
  const res = spawnSync('node', ['-r', 'ts-node/register/transpile-only', script], {
    stdio: 'inherit',
    env: childEnv,
  });
  if (res.status !== 0) {
    throw new Error('prepare-subgraph failed');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
