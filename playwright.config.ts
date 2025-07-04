import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
};

export default config;
