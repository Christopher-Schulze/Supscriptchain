import { test, expect } from '@playwright/test';
import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import { ethers } from 'ethers';
import fs from 'fs';
import http from 'http';

const rpcUrl = 'http://127.0.0.1:8545';
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/subscription-subgraph/graphql';

let hardhat: any;
let frontend: any;
let server: http.Server;
let provider: ethers.JsonRpcProvider;
let proxy: ethers.Contract;
let token: ethers.Contract;
let admin: ethers.Contract;
let owner: string;
let user: string;

const subgraphData = { subscriptions: [] as any[], payments: [] as any[] };

function startGraphServer() {
  server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 404;
      return res.end();
    }
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const { query } = JSON.parse(body || '{}');
        if (query && query.includes('subscriptions')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: { subscriptions: subgraphData.subscriptions } }));
        } else if (query && query.includes('payments')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: { payments: subgraphData.payments } }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: {} }));
        }
      } catch {
        res.statusCode = 500;
        res.end();
      }
    });
  });
  server.listen(8000);
}

function stopGraphServer() {
  if (server) server.close();
}

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
  const subJson = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','SubscriptionUpgradeable.sol','SubscriptionUpgradeable.json'), 'utf8'));
  const proxyJson = JSON.parse(fs.readFileSync(path.join('artifacts','@openzeppelin','contracts','proxy','transparent','TransparentUpgradeableProxy.sol','TransparentUpgradeableProxy.json'), 'utf8'));
  const adminJson = JSON.parse(fs.readFileSync(path.join('artifacts','@openzeppelin','contracts','proxy','transparent','ProxyAdmin.sol','ProxyAdmin.json'), 'utf8'));

  const tokenFactory = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, ownerSigner);
  token = await tokenFactory.deploy('Mock', 'MOCK', 18);
  await token.waitForDeployment();
  await token.mint(user, ethers.parseUnits('1000', 18));

  const implFactory = new ethers.ContractFactory(subJson.abi, subJson.bytecode, ownerSigner);
  const impl = await implFactory.deploy();
  await impl.waitForDeployment();

  const adminFactory = new ethers.ContractFactory(adminJson.abi, adminJson.bytecode, ownerSigner);
  admin = await adminFactory.deploy();
  await admin.waitForDeployment();

  const initData = impl.interface.encodeFunctionData('initialize', [owner]);
  const proxyFactory = new ethers.ContractFactory(proxyJson.abi, proxyJson.bytecode, ownerSigner);
  const proxyDeploy = await proxyFactory.deploy(await impl.getAddress(), await admin.getAddress(), initData);
  await proxyDeploy.waitForDeployment();
  proxy = new ethers.Contract(await proxyDeploy.getAddress(), subJson.abi, ownerSigner);

  await token.connect(userSigner).approve(await proxy.getAddress(), ethers.parseUnits('1000', 18));
  await proxy.connect(ownerSigner).createPlan(owner, await token.getAddress(), ethers.parseUnits('10', 18), 30*24*60*60, false, 0, ethers.ZeroAddress);

  startGraphServer();

  frontend = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
    cwd: path.join(__dirname, '..','frontend'),
    env: {
      ...process.env,
      NEXT_PUBLIC_CONTRACT_ADDRESS: await proxy.getAddress(),
      NEXT_PUBLIC_RPC_URL: rpcUrl,
      NEXT_PUBLIC_SUBGRAPH_URL: SUBGRAPH_URL,
    },
    stdio: 'inherit',
  });
  await new Promise(res => setTimeout(res, 10000));
});

test.afterAll(() => {
  if (frontend) frontend.kill();
  if (hardhat) hardhat.kill();
  stopGraphServer();
});

test('upgrade flow', async ({ page }) => {
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
    const sub = await proxy.userSubscriptions(user, 0);
    return sub.isActive;
  }).toBe(true);

  const subBefore = await proxy.userSubscriptions(user, 0);
  subgraphData.subscriptions.push({
    id: `${user}-0`,
    user,
    planId: '0',
    nextPaymentDate: subBefore.nextPaymentDate.toString(),
  });

  const ownerSigner = provider.getSigner(owner);
  const subV2Json = JSON.parse(fs.readFileSync(path.join('artifacts','contracts','SubscriptionUpgradeableV2.sol','SubscriptionUpgradeableV2.json'), 'utf8'));
  const subV2Factory = new ethers.ContractFactory(subV2Json.abi, subV2Json.bytecode, ownerSigner);
  const impl2 = await subV2Factory.deploy();
  await impl2.waitForDeployment();
  await admin.connect(ownerSigner).upgrade(await proxy.getAddress(), await impl2.getAddress());

  const upgraded = new ethers.Contract(await proxy.getAddress(), subV2Json.abi, ownerSigner);
  expect(await upgraded.version()).toBe('v2');

  const subAfterUpgrade = await upgraded.userSubscriptions(user, 0);
  expect(subAfterUpgrade.nextPaymentDate).toEqual(subBefore.nextPaymentDate);

  const before = subAfterUpgrade.nextPaymentDate;
  await page.goto('/payment');
  const inputs = page.locator('input');
  await inputs.nth(0).fill(user);
  await inputs.nth(1).fill('0');
  await page.click('text=Process');

  await expect.poll(async () => {
    const sub = await upgraded.userSubscriptions(user, 0);
    return sub.nextPaymentDate > before;
  }).toBe(true);

  const finalSub = await upgraded.userSubscriptions(user, 0);
  subgraphData.subscriptions[0].nextPaymentDate = finalSub.nextPaymentDate.toString();
  subgraphData.payments.push({
    id: '1',
    user,
    planId: '0',
    amount: ethers.parseUnits('10', 18).toString(),
    newNextPaymentDate: finalSub.nextPaymentDate.toString(),
  });

  // verify events before and after upgrade are returned by the subgraph
  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        '{ subscriptions { id planId } payments { id planId } }',
    }),
  });
  const json = await res.json();
  expect(json.data.subscriptions.length).toBe(1);
  expect(json.data.subscriptions[0].id).toBe(`${user}-0`);
  expect(json.data.payments.length).toBe(1);
  expect(json.data.payments[0].id).toBe('1');

  expect(await upgraded.version()).toBe('v2');
});

test('analytics page shows subgraph data', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page.locator('h1')).toHaveText('Analytics');
  await expect(page.locator('ul').nth(0)).toContainText(user);
  await expect(page.locator('ul').nth(1)).toContainText('amount');
});

