'use client';
import { useState } from 'react';
import { usePlans } from '../../lib/plansStore';
import useWallet from '../../lib/useWallet';

export default function Plans() {
  const { account, connect } = useWallet();
  const { plans } = usePlans();
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

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
