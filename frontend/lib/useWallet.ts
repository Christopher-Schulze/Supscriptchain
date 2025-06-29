import { useState, useEffect } from "react";

export default function useWallet() {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length) setAccount(accounts[0]);
    });
  }, []);

  async function connect() {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return alert("MetaMask not found");
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0]);
  }

  return { account, connect };
}
