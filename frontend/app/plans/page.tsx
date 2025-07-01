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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const contract = await getContract();
        const nextId: bigint = await contract.nextPlanId();
        const list: Plan[] = [];
        for (let i = 0n; i < nextId; i++) {
          const plan = await contract.plans(i);
          list.push(plan as Plan);
        }
        setPlans(list);
      } catch (err: any) {
        console.error(err);
        alert(err?.message || 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1>Available Plans</h1>
      {!account && <button onClick={connect}>Connect Wallet</button>}
      {loading ? (
        <p>Loading plans...</p>
      ) : (
        <ul>
          {plans.map((p, idx) => (
            <li key={idx}>
              Plan {idx}: token {p.token} price {p.price.toString()} billing {p.billingCycle.toString()}s
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
