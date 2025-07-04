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

test('connect falls back to WalletConnect using env chain id', async () => {
  const request = jest.fn().mockResolvedValue(['0xdef']);
  const enable = jest.fn();
  const WalletConnectProvider = require('@walletconnect/web3-provider') as jest.Mock;
  WalletConnectProvider.mockImplementation(() => ({ enable, request }));
  (window as any).ethereum = undefined;
  const { result } = renderHook(() => useWallet(), { wrapper: StoreProvider });
  await act(async () => {
    await result.current.connect();
  });
  expect(WalletConnectProvider).toHaveBeenCalledWith({
    rpc: { [Number(process.env.NEXT_PUBLIC_CHAIN_ID)]: process.env.NEXT_PUBLIC_RPC_URL },
  });
  expect(enable).toHaveBeenCalled();
  expect(result.current.account).toBe('0xdef');
});
