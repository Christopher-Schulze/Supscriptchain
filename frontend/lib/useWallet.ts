import { useState, useEffect } from "react";

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export default function useWallet() {
  const [account, setAccount] = useState<string | null>(null);

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
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth) return alert("MetaMask not found");
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    setAccount(accounts[0]);
  }

  return { account, connect };
}
