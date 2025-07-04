import { renderHook, act } from '@testing-library/react';
import useWallet from '../lib/useWallet';
import { StoreProvider } from '../lib/store';

jest.mock('@walletconnect/web3-provider', () => {
  return jest.fn().mockImplementation(() => ({ enable: jest.fn() }));
});

test('connect uses injected provider', async () => {
  const request = jest.fn().mockResolvedValue(['0xabc']);
  (window as any).ethereum = { request };
  const { result } = renderHook(() => useWallet(), { wrapper: StoreProvider });
  await act(async () => {
    await result.current.connect();
  });
  expect(result.current.account).toBe('0xabc');
});
