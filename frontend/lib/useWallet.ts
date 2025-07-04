import { useState, useEffect } from "react";
import { useStore } from "./store";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { env } from "./env";

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export default function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const { setMessage } = useStore();

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
            1: env.NEXT_PUBLIC_RPC_URL,
          },
        });
        await wc.enable();
        eth = wc as unknown as EthereumProvider;
      } catch {
        setMessage("Wallet not found");
        return;
      }
    }
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts[0]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setMessage(msg);
    }
  }

  return { account, connect };
}
