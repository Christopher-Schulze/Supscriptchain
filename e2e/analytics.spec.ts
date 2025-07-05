import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import * as path from 'path';
import http from 'http';

const SUBGRAPH_URL =
  'http://localhost:8000/subgraphs/name/subscription-subgraph/graphql';

let frontend: any;
let server: http.Server;

const data = {
  plans: [
    { id: '0', totalPaid: '100' },
    { id: '1', totalPaid: '50' },
  ],
  payments: [{ planId: '0', amount: '10' }],
};

function startGraphServer() {
  server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 404;
      return res.end();
    }
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const { query } = JSON.parse(body || '{}');
      if (query && query.includes('plans')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { plans: data.plans } }));
      } else if (query && query.includes('payments')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { payments: data.payments } }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
      }
    });
  });
  server.listen(8000);
}

function stopGraphServer() {
  if (server) server.close();
}

test.beforeAll(async () => {
  startGraphServer();
  frontend = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
    cwd: path.join(__dirname, '..', 'frontend'),
    env: {
      ...process.env,
      NEXT_PUBLIC_CONTRACT_ADDRESS:
        '0x0000000000000000000000000000000000000000',
      NEXT_PUBLIC_CHAIN_ID: '31337',
      NEXT_PUBLIC_RPC_URL: 'http://127.0.0.1:8545',
      NEXT_PUBLIC_SUBGRAPH_URL: SUBGRAPH_URL,
    },
    stdio: 'inherit',
  });
  await new Promise((res) => setTimeout(res, 10000));
});

test.afterAll(() => {
  if (frontend) frontend.kill();
  stopGraphServer();
});

test('shows revenue chart', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.fill('#filter-plan', '0');
  await page.click('text=Apply');
  await expect(page.locator('canvas').nth(1)).toBeVisible();
});
