import { expect } from 'chai';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import * as path from 'path';
import fs from 'fs';
import { ethers } from 'ethers';

const rpcUrl = 'http://127.0.0.1:8545';

describe('upgrade.ts via ts-node', function () {
  this.timeout(60000);
  let hardhat: ChildProcess;
  let provider: ethers.JsonRpcProvider;
  let proxy: ethers.Contract;

  before(async function () {
    hardhat = spawn('npx', ['hardhat', 'node'], { stdio: 'inherit' });
    await new Promise((res) => setTimeout(res, 4000));
    spawnSync('npx', ['hardhat', 'compile'], { stdio: 'inherit' });

    provider = new ethers.JsonRpcProvider(rpcUrl);
    const [owner] = await provider.listAccounts();
    const ownerSigner = provider.getSigner(owner);

    const subJson = JSON.parse(
      fs.readFileSync(
        path.join('artifacts', 'contracts', 'SubscriptionUpgradeable.sol', 'SubscriptionUpgradeable.json'),
        'utf8',
      ),
    );
    const proxyJson = JSON.parse(
      fs.readFileSync(
        path.join(
          'artifacts',
          '@openzeppelin',
          'contracts',
          'proxy',
          'transparent',
          'TransparentUpgradeableProxy.sol',
          'TransparentUpgradeableProxy.json',
        ),
        'utf8',
      ),
    );
    const adminJson = JSON.parse(
      fs.readFileSync(
        path.join(
          'artifacts',
          '@openzeppelin',
          'contracts',
          'proxy',
          'transparent',
          'ProxyAdmin.sol',
          'ProxyAdmin.json',
        ),
        'utf8',
      ),
    );

    const implFactory = new ethers.ContractFactory(subJson.abi, subJson.bytecode, ownerSigner);
    const impl = await implFactory.deploy();
    await impl.waitForDeployment();

    const adminFactory = new ethers.ContractFactory(adminJson.abi, adminJson.bytecode, ownerSigner);
    const admin = await adminFactory.deploy();
    await admin.waitForDeployment();

    const initData = impl.interface.encodeFunctionData('initialize', [owner]);
    const proxyFactory = new ethers.ContractFactory(proxyJson.abi, proxyJson.bytecode, ownerSigner);
    const proxyDeploy = await proxyFactory.deploy(
      await impl.getAddress(),
      await admin.getAddress(),
      initData,
    );
    await proxyDeploy.waitForDeployment();
    proxy = new ethers.Contract(await proxyDeploy.getAddress(), subJson.abi, ownerSigner);
  });

  after(() => {
    if (hardhat) hardhat.kill('SIGINT');
  });

  it('runs upgrade.ts and generates manifest', async function () {
    const manifest = path.resolve(__dirname, '..', 'subgraph', 'subgraph.local.yaml');
    if (fs.existsSync(manifest)) fs.unlinkSync(manifest);

    const envPath = path.resolve(__dirname, '..', '.env');
    const proxyAddress = await proxy.getAddress();
    const envContent = `MERCHANT_ADDRESS=${ethers.ZeroAddress}
TOKEN_ADDRESS=${ethers.ZeroAddress}
PRICE_FEED=${ethers.ZeroAddress}
BILLING_CYCLE=1
PRICE_IN_USD=false
USD_PRICE=1
FIXED_PRICE=1
SUBSCRIPTION_ADDRESS=${proxyAddress}
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
SUBGRAPH_VERSION=v1
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
      const res = spawnSync(
        'node',
        ['-r', 'ts-node/register/transpile-only', 'scripts/upgrade.ts'],
        {
          env: { ...process.env, HARDHAT_NETWORK: 'localhost' },
          stdio: 'inherit',
        },
      );
      expect(res.status).to.equal(0);
    } finally {
      fs.unlinkSync(envPath);
    }

    expect(fs.existsSync(manifest)).to.equal(true);
    const yaml = fs.readFileSync(manifest, 'utf8');
    expect(yaml).to.include('network: localhost');
    expect(yaml).to.include(await proxy.getAddress());
    fs.unlinkSync(manifest);
  });
});
