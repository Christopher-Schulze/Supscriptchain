import { jest } from '@jest/globals';

const originalEnv = { ...process.env };

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

test('exports validated env variables', async () => {
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111';
  process.env.NEXT_PUBLIC_CHAIN_ID = '42';
  process.env.NEXT_PUBLIC_RPC_URL = 'https://example.com';
  process.env.NEXT_PUBLIC_SUBGRAPH_URL = 'https://example.com/subgraph';

  const mod = await import('../lib/env');
  expect(mod.env).toEqual({
    NEXT_PUBLIC_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
    NEXT_PUBLIC_CHAIN_ID: 42,
    NEXT_PUBLIC_RPC_URL: 'https://example.com',
    NEXT_PUBLIC_SUBGRAPH_URL: 'https://example.com/subgraph',
  });
});

test('throws when variable missing', async () => {
  delete process.env.NEXT_PUBLIC_RPC_URL;
  await expect(import('../lib/env')).rejects.toThrow();
});

test('throws when variable invalid', async () => {
  process.env.NEXT_PUBLIC_RPC_URL = 'not-a-url';
  await expect(import('../lib/env')).rejects.toThrow();
});
