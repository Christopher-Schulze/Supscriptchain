'use client';
import { useState } from 'react';
import { usePlans } from '../../lib/plansStore';
import useWallet from '../../lib/useWallet';

interface Plan {
  merchant: string;
  token: string;
  tokenDecimals: bigint;
  price: bigint;
  billingCycle: bigint;
  priceInUsd: boolean;
  usdPrice: bigint;
  priceFeedAddress: string;
}

export default function Plans() {
  const { account, connect } = useWallet();
  const { plans, reload } = usePlans();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Available Plans</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <div style={{ marginBottom: 10 }}>
        <a href="/plans/create">Create Plan</a> |{' '}
        <a href="/plans/manage">Manage Plans</a>
      </div>
      <ul className="list">
        {plans.map((p, idx) => (
          <li key={idx}>
            Plan {idx}: token {p.token} price {p.price.toString()} billing {p.billingCycle.toString()}s
          </li>
        ))}
      </ul>
    </div>
  );
}
