import { useState, useEffect } from "react";
import { useStore } from "./store";
import { useTranslation } from 'react-i18next';
import WalletConnectProvider from "@walletconnect/web3-provider";
import CoinbaseWalletSDK from "@coinbase/wallet-sdk";
import { env } from "./env";

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export default function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const { setMessage } = useStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accounts) => {
      const list = accounts as string[];
      if (list.length) setAccount(list[0]);
    });
  }, []);

  async function connect() {
    if (typeof window === "undefined") return;
    let eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth) {
      try {
        const wc = new WalletConnectProvider({
          rpc: {
            [env.NEXT_PUBLIC_CHAIN_ID]: env.NEXT_PUBLIC_RPC_URL,
          },
        });
        await wc.enable();
        eth = wc as unknown as EthereumProvider;
      } catch {
        try {
          const cb = new CoinbaseWalletSDK({ appName: 'Supscriptchain' });
          eth = cb.makeWeb3Provider(
            env.NEXT_PUBLIC_RPC_URL,
            env.NEXT_PUBLIC_CHAIN_ID,
          ) as unknown as EthereumProvider;
        } catch {
          setMessage({ text: t('messages.wallet_not_found'), type: 'warning' });
          return;
        }
      }
    }
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const acc = accounts[0];
      setAccount(acc);
      setMessage({ text: t('messages.wallet_connected', { account: acc }), type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('messages.failed_connect');
      setMessage({ text: t('messages.transaction_failed', { error: msg }), type: 'error' });
    }
  }

  return { account, connect };
}
