import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

let frontend: any;

test.beforeAll(async () => {
  frontend = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
    stdio: 'inherit',
  });
  await new Promise(res => setTimeout(res, 10000));
});

test.afterAll(() => {
  if (frontend) frontend.kill();
});

test('renders not found page', async ({ page }) => {
  await page.goto('/some/unknown/route');
  await expect(page.getByRole('heading')).toHaveText('Page not found');
  await expect(page.locator('a[href="/"]')).toBeVisible();
});
