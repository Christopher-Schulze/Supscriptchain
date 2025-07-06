import { ethers, upgrades, network } from 'hardhat';
import { spawnSync } from 'child_process';
import path from 'path';
import { loadEnv } from './env';

export async function upgrade() {
  const env = loadEnv();
  const proxy = env.SUBSCRIPTION_ADDRESS;
  if (!proxy) {
    throw new Error("SUBSCRIPTION_ADDRESS not set");
  }

  const SubV2 = await ethers.getContractFactory("SubscriptionUpgradeableV2");
  const upgraded = await upgrades.upgradeProxy(proxy, SubV2);
  await upgraded.waitForDeployment();

  const impl = await upgrades.erc1967.getImplementationAddress(proxy);
  console.log("Upgraded implementation at:", impl);

  const code = await ethers.provider.getCode(impl);
  console.log("Implementation code size:", code.length);

  const version = await (upgraded as any).version();
  if (version !== "v2") {
    throw new Error(`Unexpected version: ${version}`);
  }
  console.log("Contract version:", version);

  const net = process.env.NETWORK || process.env.HARDHAT_NETWORK || network.name;
  const addr = proxy;
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

if (require.main === module) {
  upgrade().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
