import { spawn, spawnSync, execSync, ChildProcess } from 'child_process';
import { expect } from 'chai';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

// Utility waiting for a URL to respond with 200
async function waitFor(
  url: string,
  attempts = 60,
  delayMs = 1000,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

describe('Subgraph integration', function () {
  this.timeout(300000); // 5 minutes

  let hardhat: ChildProcess;
  let graphNode: ChildProcess;

  before(async function () {
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch {
      this.skip();
      return;
    }

    hardhat = spawn('npx', ['hardhat', 'node'], { stdio: 'inherit' });
    await new Promise((r) => setTimeout(r, 4000));
    spawnSync('npx', ['hardhat', 'compile'], { stdio: 'inherit' });

    graphNode = spawn(
      'docker',
      [
        'run',
        '--rm',
        '-p',
        '8000:8000',
        '-p',
        '8020:8020',
        '-e',
        'postgres_host=host.docker.internal',
        '-e',
        'postgres_user=graph',
        '-e',
        'postgres_pass=password',
        '-e',
        'postgres_db=graph-node',
        '-e',
        'ethereum=hardhat:http://host.docker.internal:8545',
        '-e',
        'ipfs=host.docker.internal:5001',
        'graphprotocol/graph-node:v0.33.0',
      ],
      { stdio: 'inherit' },
    );

    await waitFor('http://localhost:8000/health');
  });

  after(async () => {
    if (graphNode) graphNode.kill('SIGINT');
    if (hardhat) hardhat.kill('SIGINT');
  });

  it('indexes events across upgrades', async () => {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const [owner, user] = await provider.listAccounts();
    const ownerSigner = provider.getSigner(owner);
    const userSigner = provider.getSigner(user);

    const tokenJson = JSON.parse(
      fs.readFileSync(
        path.join('artifacts', 'contracts', 'MockToken.sol', 'MockToken.json'),
        'utf8',
      ),
    );
    const tokenFactory = new ethers.ContractFactory(
      tokenJson.abi,
      tokenJson.bytecode,
      ownerSigner,
    );
    const token = await tokenFactory.deploy('Mock', 'MOCK', 18);
    await token.waitForDeployment();
    await token.mint(user, ethers.parseUnits('100', 18));

    const subJson = JSON.parse(
      fs.readFileSync(
        path.join(
          'artifacts',
          'contracts',
          'SubscriptionUpgradeable.sol',
          'SubscriptionUpgradeable.json',
        ),
        'utf8',
      ),
    );
    const subV2Json = JSON.parse(
      fs.readFileSync(
        path.join(
          'artifacts',
          'contracts',
          'SubscriptionUpgradeableV2.sol',
          'SubscriptionUpgradeableV2.json',
        ),
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

    const implFactory = new ethers.ContractFactory(
      subJson.abi,
      subJson.bytecode,
      ownerSigner,
    );
    const impl = await implFactory.deploy();
    await impl.waitForDeployment();

    const adminFactory = new ethers.ContractFactory(
      adminJson.abi,
      adminJson.bytecode,
      ownerSigner,
    );
    const admin = await adminFactory.deploy();
    await admin.waitForDeployment();

    const initData = impl.interface.encodeFunctionData('initialize', [owner]);
    const proxyFactory = new ethers.ContractFactory(
      proxyJson.abi,
      proxyJson.bytecode,
      ownerSigner,
    );
    const proxyDeploy = await proxyFactory.deploy(
      await impl.getAddress(),
      await admin.getAddress(),
      initData,
    );
    await proxyDeploy.waitForDeployment();
    let subscription = new ethers.Contract(
      await proxyDeploy.getAddress(),
      subJson.abi,
      ownerSigner,
    );

    await token
      .connect(userSigner)
      .approve(subscription.getAddress(), ethers.parseUnits('100', 18));
    await subscription
      .connect(ownerSigner)
      .createPlan(
        owner,
        token.getAddress(),
        ethers.parseUnits('1', 18),
        60,
        false,
        0,
        ethers.ZeroAddress,
      );
    await subscription.connect(userSigner).subscribe(0);

    const subV2Factory = new ethers.ContractFactory(
      subV2Json.abi,
      subV2Json.bytecode,
      ownerSigner,
    );
    const impl2 = await subV2Factory.deploy();
    await impl2.waitForDeployment();

    const adminContract = new ethers.Contract(
      await admin.getAddress(),
      adminJson.abi,
      ownerSigner,
    );
    await adminContract.upgrade(await proxyDeploy.getAddress(), await impl2.getAddress());
    subscription = new ethers.Contract(await proxyDeploy.getAddress(), subV2Json.abi, ownerSigner);

    await subscription.connect(ownerSigner).processPayment(user, 0);

    process.env.NETWORK = 'hardhat';
    process.env.CONTRACT_ADDRESS = await subscription.getAddress();
    spawnSync('npm', ['run', 'build-subgraph'], { stdio: 'inherit' });

    spawnSync(
      'npx',
      [
        'graph',
        'deploy',
        '--node',
        'http://localhost:8020/',
        '--ipfs',
        'http://localhost:5001/',
        'subscription-subgraph',
        'subgraph/subgraph.local.yaml',
      ],
      { stdio: 'inherit' },
    );

    // wait for indexing
    await new Promise((r) => setTimeout(r, 5000));

    const res = await fetch(
      'http://localhost:8000/subgraphs/name/subscription-subgraph/graphql',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            '{ plans { id totalPaid } subscriptions { id } payments { id planId amount } }',
        }),
      },
    );
    const json = await res.json();
    expect(json.data.subscriptions.length).to.equal(1);
    expect(json.data.payments.length).to.equal(1);
    expect(json.data.plans[0].totalPaid).to.equal(
      ethers.parseUnits('1', 18).toString(),
    );
  });
});
