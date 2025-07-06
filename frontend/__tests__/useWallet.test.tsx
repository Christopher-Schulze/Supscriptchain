import { renderHook, act, waitFor } from '@testing-library/react';
import useWallet from '../lib/useWallet';
import { StoreProvider, useStore } from '../lib/store';

jest.mock('@walletconnect/web3-provider', () => {
  return jest.fn().mockImplementation(() => ({ enable: jest.fn() }));
});
jest.mock('@coinbase/wallet-sdk', () => {
  return jest.fn().mockImplementation(() => ({ makeWeb3Provider: jest.fn() }));
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

test('connect falls back to Coinbase Wallet when WalletConnect fails', async () => {
  const request = jest.fn().mockResolvedValue(['0xaaa']);
  const makeWeb3Provider = jest.fn().mockReturnValue({ request });
  const CoinbaseWalletSDK = require('@coinbase/wallet-sdk') as jest.Mock;
  CoinbaseWalletSDK.mockImplementation(() => ({ makeWeb3Provider }));
  const WalletConnectProvider = require('@walletconnect/web3-provider') as jest.Mock;
  WalletConnectProvider.mockImplementation(() => { throw new Error('wc'); });
  (window as any).ethereum = undefined;
  const { result } = renderHook(() => useWallet(), { wrapper: StoreProvider });
  await act(async () => {
    await result.current.connect();
  });
  expect(CoinbaseWalletSDK).toHaveBeenCalledWith({ appName: 'Supscriptchain' });
  expect(makeWeb3Provider).toHaveBeenCalledWith(
    process.env.NEXT_PUBLIC_RPC_URL,
    Number(process.env.NEXT_PUBLIC_CHAIN_ID),
  );
  expect(result.current.account).toBe('0xaaa');
});

test('shows error message when connection fails', async () => {
  const request = jest.fn((args: { method: string }) => {
    if (args.method === 'eth_accounts') return Promise.resolve([]);
    return Promise.reject(new Error('oops'));
  });
  (window as any).ethereum = { request };
  const { result } = renderHook(
    () => ({ wallet: useWallet(), store: useStore() }),
    { wrapper: StoreProvider },
  );
  await act(async () => {
    await result.current.wallet.connect().catch(() => {});
  });
  await waitFor(() =>
    expect(result.current.store.message?.text).toBe('Transaction failed: oops'),
  );
});
