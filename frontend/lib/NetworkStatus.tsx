'use client';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { env } from './env';
import { useStore } from './store';

export default function NetworkStatus() {
  const [name, setName] = useState('');
  const [block, setBlock] = useState<number | null>(null);
  const { setMessage } = useStore();

  useEffect(() => {
    let cancelled = false;
    const provider: ethers.Provider =
      typeof window !== 'undefined' && (window as any).ethereum
        ? new ethers.BrowserProvider((window as any).ethereum)
        : new ethers.JsonRpcProvider(env.NEXT_PUBLIC_RPC_URL);

    async function load() {
      try {
        const net = await provider.getNetwork();
        const blk = await provider.getBlockNumber();
        if (!cancelled) {
          setName(net.name === 'unknown' ? String(net.chainId) : net.name);
          setBlock(blk);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to connect';
          setMessage({ text: msg, type: 'error' });
        }
      }
    }

    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [setMessage]);

  if (!name || block === null) return null;

  return (
    <span className="network-status" style={{ float: 'right', marginLeft: 10 }}>
      {name} #{block}
    </span>
  );
}
