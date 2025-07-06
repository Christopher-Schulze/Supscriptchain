import { expect } from 'chai';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import * as path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { ethers } from 'ethers';

const rpcUrl = 'http://127.0.0.1:8545';

describe('process-due-payments metrics', function () {
  this.timeout(60000);
  let hardhat: ChildProcess;
  let provider: ethers.JsonRpcProvider;
  let subscription: ethers.Contract;
  let token: ethers.Contract;
  let user: string;

  before(async function () {
    hardhat = spawn('npx', ['hardhat', 'node'], { stdio: 'inherit' });
    await new Promise((res) => setTimeout(res, 4000));
    spawnSync('npx', ['hardhat', 'compile'], { stdio: 'inherit' });

    provider = new ethers.JsonRpcProvider(rpcUrl);
    const accounts = await provider.listAccounts();
    const owner = accounts[0];
    user = accounts[1];
    const ownerSigner = provider.getSigner(owner);
    const userSigner = provider.getSigner(user);

    const mockJson = JSON.parse(
      fs.readFileSync(
        path.join('artifacts', 'contracts', 'MockToken.sol', 'MockToken.json'),
        'utf8',
      ),
    );
    const subJson = JSON.parse(
      fs.readFileSync(
        path.join('artifacts', 'contracts', 'Subscription.sol', 'Subscription.json'),
        'utf8',
      ),
    );

    const tokenFactory = new ethers.ContractFactory(
      mockJson.abi,
      mockJson.bytecode,
      ownerSigner,
    );
    token = await tokenFactory.deploy('Mock', 'MOCK', 18);
    await token.waitForDeployment();
    await token.mint(user, ethers.parseUnits('1000', 18));

    const subFactory = new ethers.ContractFactory(
      subJson.abi,
      subJson.bytecode,
      ownerSigner,
    );
    subscription = await subFactory.deploy();
    await subscription.waitForDeployment();

    await token
      .connect(userSigner)
      .approve(await subscription.getAddress(), ethers.parseUnits('1000', 18));
    await subscription.createPlan(
      owner,
      await token.getAddress(),
      ethers.parseUnits('10', 18),
      60,
      false,
      0,
      ethers.ZeroAddress,
    );
    await subscription.connect(userSigner).subscribe(0);
  });

  after(() => {
    if (hardhat) hardhat.kill('SIGINT');
  });

  it('processes payments and updates metrics', async function () {
    const subsFile = path.join(__dirname, 'subscribers.metrics.tmp.json');
    fs.writeFileSync(subsFile, JSON.stringify([user], null, 2));
    const port = 9095;

    const res = spawnSync(
      'node',
      ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts'],
      {
        env: {
          ...process.env,
          TS_NODE_TRANSPILE_ONLY: '1',
          HARDHAT_NETWORK: 'localhost',
          SUBSCRIPTION_ADDRESS: await subscription.getAddress(),
          PLAN_ID: '0',
          SUBSCRIBERS_FILE: subsFile,
          METRICS_PORT: String(port),
        },
        encoding: 'utf8',
      },
    );

    fs.unlinkSync(subsFile);
    expect(res.status).to.equal(0);

    const metrics = await fetch(`http://localhost:${port}/metrics`).then((r) => r.text());
    expect(metrics).to.include('payment_success_total{plan_id="0"} 1');
  });
});
