import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { upgrade } from '../scripts/upgrade';
import fs from 'fs';
import path from 'path';

it('runs upgrade script and validates version', async function () {
  const [owner] = await ethers.getSigners();

  const SubV1 = await ethers.getContractFactory('SubscriptionUpgradeable', owner);
  const proxy = await upgrades.deployProxy(SubV1, [owner.address], { initializer: 'initialize' });
  await proxy.waitForDeployment();

  const envPath = path.resolve(__dirname, '..', '.env');
  const envContent = `MERCHANT_ADDRESS=${owner.address}
TOKEN_ADDRESS=${owner.address}
PRICE_FEED=${owner.address}
BILLING_CYCLE=1
PRICE_IN_USD=false
USD_PRICE=1
FIXED_PRICE=1
SUBSCRIPTION_ADDRESS=${await proxy.getAddress()}
PLAN_ID=0
MAX_CONCURRENCY=1
MAX_RETRIES=1
RETRY_BASE_DELAY_MS=1
FAIL_ON_FAILURE=false
INTERVAL=1
NOTIFY_WEBHOOK=dummy
LOG_FILE=tmp.log
LOKI_URL=dummy
LOG_LEVEL=info
FAILURES_FILE=failures.log
GRAPH_NODE_URL=http://localhost:8030
IPFS_URL=http://localhost:5001
SUBGRAPH_NAME=test/subgraph
GRAPH_ACCESS_TOKEN=dummy
SUBGRAPH_VERSION=1
GRAPH_NODE_CMD=echo
GRAPH_NODE_ARGS=dummy
GRAPH_NODE_HEALTH=http://localhost:8030/health
GRAPH_NODE_HEALTH_INTERVAL=1
GRAPH_NODE_MAX_FAILS=1
GRAPH_NODE_RESTART_DELAY=1
METRICS_PORT=0
GRAPH_NODE_LOG=graph.log
SEPOLIA_RPC_URL=http://localhost
SEPOLIA_PRIVATE_KEY=0x00
MAINNET_RPC_URL=http://localhost
MAINNET_PRIVATE_KEY=0x00
`;
  fs.writeFileSync(envPath, envContent);

  try {
    await upgrade();
  } finally {
    fs.unlinkSync(envPath);
  }

  const upgraded = await ethers.getContractAt('SubscriptionUpgradeableV2', await proxy.getAddress());
  expect(await upgraded.version()).to.equal('v2');

  const manifest = path.resolve(__dirname, '..', 'subgraph', 'subgraph.local.yaml');
  expect(fs.existsSync(manifest)).to.equal(true);
  fs.unlinkSync(manifest);
});
