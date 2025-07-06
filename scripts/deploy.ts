import { ethers, upgrades, network } from 'hardhat';
import { spawnSync } from 'child_process';
import path from 'path';
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
