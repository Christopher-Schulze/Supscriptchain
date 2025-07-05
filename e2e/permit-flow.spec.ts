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
const PRICE = ethers.parseUnits('10', 18);

test.beforeAll(async () => {
  hardhat = spawn('npx', ['hardhat', 'node'], { stdio: 'inherit' });
  await new Promise(res => setTimeout(res, 4000));

  spawnSync('npx', ['hardhat', 'compile'], { stdio: 'inherit' });

  provider = new ethers.JsonRpcProvider(rpcUrl);
  owner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  user = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const ownerSigner = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider,
  );

  const permitJson = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','mocks','PermitToken.sol','PermitToken.json'), 'utf8'));
  const subJson = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','Subscription.sol','Subscription.json'), 'utf8'));

  const tokenFactory = new ethers.ContractFactory(
    permitJson.abi,
    permitJson.bytecode,
    ownerSigner,
  );
  token = await tokenFactory.deploy('Permit', 'PRT');
  await token.waitForDeployment();
  await token.mint(user, ethers.parseUnits('1000', 18));

  const subscriptionFactory = new ethers.ContractFactory(subJson.abi, subJson.bytecode, ownerSigner);
  subscription = await subscriptionFactory.deploy();
  await subscription.waitForDeployment();

  await subscription.createPlan(owner, await token.getAddress(), PRICE, 30*24*60*60, false,0, ethers.ZeroAddress);

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

test('permit subscription flow', async ({ page }) => {
  await page.addInitScript(
    ({ rpc, account }) => {
      (window as any).selectedAccount = account;
      (window as any).rpcUrl = rpc;
      window.ethereum = {
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
            return [(window as any).selectedAccount];
          }
          const res = await fetch((window as any).rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
          });
          const json = await res.json();
          if (json.error) throw new Error(json.error.message);
          return json.result;
        },
      } as any;
    },
    { rpc: rpcUrl, account: user },
  );

  const balBefore = await token.balanceOf(user);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  await page.goto('/manage');
  await page.click('text=Connect Wallet');
  const inputs = page.locator('input');
  await inputs.nth(0).fill('0');
  await inputs.nth(1).fill(deadline.toString());
  await page.click('text=Get Permit Signature');
  await page.click('text=Subscribe with Permit');

  await expect.poll(async () => {
    const sub = await subscription.userSubscriptions(user, 0);
    return sub.isActive;
  }).toBe(true);

  expect(await token.balanceOf(user)).toEqual(balBefore - PRICE);
});
