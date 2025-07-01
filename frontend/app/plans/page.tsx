'use client';
import { useEffect, useState } from 'react';
import { getContract } from '../../lib/contract';
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const contract = await getContract();
        const nextId: bigint = await contract.nextPlanId();
        const list: Plan[] = [];
        for (let i = 0n; i < nextId; i++) {
          const plan = await contract.plans(i);
          list.push(plan as Plan);
        }
        setPlans(list);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1>Available Plans</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <ul>
        {plans.map((p, idx) => (
          <li key={idx}>
            Plan {idx}: token {p.token} price {p.price.toString()} billing {p.billingCycle.toString()}s
          </li>
        ))}
      </ul>
    </div>
  );
}
