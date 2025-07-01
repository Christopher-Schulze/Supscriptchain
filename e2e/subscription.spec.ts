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
let user: string;

test.beforeAll(async () => {
  hardhat = spawn('npx', ['hardhat', 'node'], { stdio: 'inherit' });
  await new Promise(res => setTimeout(res, 4000));

  spawnSync('npx', ['hardhat', 'compile'], { stdio: 'inherit' });

  provider = new ethers.JsonRpcProvider(rpcUrl);
  const accounts = await provider.listAccounts();
  owner = accounts[0];
  user = accounts[1];
  const ownerSigner = provider.getSigner(owner);
  const userSigner = provider.getSigner(user);

  const mockJson = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','MockToken.sol','MockToken.json'), 'utf8'));
  const subJson = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','Subscription.sol','Subscription.json'), 'utf8'));

  const tokenFactory = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, ownerSigner);
  token = await tokenFactory.deploy('Mock', 'MOCK', 18);
  await token.waitForDeployment();
  await token.mint(user, ethers.parseUnits('1000', 18));

  const subscriptionFactory = new ethers.ContractFactory(subJson.abi, subJson.bytecode, ownerSigner);
  subscription = await subscriptionFactory.deploy();
  await subscription.waitForDeployment();

  await token.connect(userSigner).approve(await subscription.getAddress(), ethers.parseUnits('1000', 18));
  await subscription.createPlan(owner, await token.getAddress(), ethers.parseUnits('10',18), 30*24*60*60, false,0, ethers.ZeroAddress);

  frontend = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
    cwd: path.join(__dirname, '..','frontend'),
    env: { ...process.env, NEXT_PUBLIC_CONTRACT_ADDRESS: await subscription.getAddress(), NEXT_PUBLIC_RPC_URL: rpcUrl },
    stdio: 'inherit',
  });
  await new Promise(res => setTimeout(res, 10000));
});

test.afterAll(() => {
  if (frontend) frontend.kill();
  if (hardhat) hardhat.kill();
});

test('complete flow', async ({ page }) => {
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

  await page.goto('/manage');
  await page.click('text=Connect Wallet');
  await page.fill('input', '0');
  await page.click('text=Subscribe');

  await expect.poll(async () => {
    const sub = await subscription.userSubscriptions(user, 0);
    return sub.isActive;
  }).toBe(true);

  const before = (await subscription.userSubscriptions(user, 0)).nextPaymentDate;
  await page.goto('/payment');
  const inputs = page.locator('input');
  await inputs.nth(0).fill(user);
  await inputs.nth(1).fill('0');
  await page.click('text=Process');

  await expect.poll(async () => {
    const sub = await subscription.userSubscriptions(user, 0);
    return sub.nextPaymentDate > before;
  }).toBe(true);
});
