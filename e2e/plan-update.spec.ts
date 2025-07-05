import { test, expect } from '@playwright/test';
import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import { ethers } from 'ethers';
import fs from 'fs';

const rpcUrl = 'http://127.0.0.1:8545';

let hardhat: any;
let frontend: any;
let provider: ethers.JsonRpcProvider;
let subscription: ethers.Contract;
let token: ethers.Contract;
let owner: string;

// start hardhat node and deploy contracts
test.beforeAll(async () => {
  hardhat = spawn('npx', ['hardhat', 'node'], { stdio: 'inherit' });
  await new Promise(res => setTimeout(res, 4000));

  spawnSync('npx', ['hardhat', 'compile'], { stdio: 'inherit' });

  provider = new ethers.JsonRpcProvider(rpcUrl);
  const accounts = await provider.listAccounts();
  owner = accounts[0];
  const ownerSigner = provider.getSigner(owner);

  const mockJson = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','MockToken.sol','MockToken.json'), 'utf8'));
  const subJson = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','Subscription.sol','Subscription.json'), 'utf8'));

  const tokenFactory = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, ownerSigner);
  token = await tokenFactory.deploy('Mock', 'MOCK', 18);
  await token.waitForDeployment();

  const subscriptionFactory = new ethers.ContractFactory(subJson.abi, subJson.bytecode, ownerSigner);
  subscription = await subscriptionFactory.deploy();
  await subscription.waitForDeployment();

  frontend = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
    cwd: path.join(__dirname, '..', 'frontend'),
    env: { ...process.env, NEXT_PUBLIC_CONTRACT_ADDRESS: await subscription.getAddress(), NEXT_PUBLIC_RPC_URL: rpcUrl },
    stdio: 'inherit',
  });
  await new Promise(res => setTimeout(res, 10000));
});

test.afterAll(() => {
  if (frontend) frontend.kill();
  if (hardhat) hardhat.kill();
});

test('plan update flow', async ({ page }) => {
  await page.addInitScript(() => {
    window.ethereum = {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        const res = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        return json.result;
      },
    } as any;
  });

  // create plan via UI
  await page.goto('/plans/create');
  await page.click('text=Connect Wallet');
  await page.fill('#token', await token.getAddress());
  await page.fill('#billing', '60');
  await page.fill('#token-price', '10');
  await page.click('text=Create');

  await expect.poll(async () => (await subscription.nextPlanId()).toString()).toBe('1');

  // update the plan via UI
  await page.goto('/plans/update');
  await page.fill('#update-plan-id', '0');
  await page.fill('#update-billing', '120');
  await page.fill('#update-token-price', '15');
  await page.click('text=Update');

  await expect.poll(async () => {
    const p = await subscription.plans(0);
    return p.billingCycle === 120n && p.price === 15n;
  }).toBe(true);
});
