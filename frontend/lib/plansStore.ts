'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getContract } from './contract';

export interface Plan {
  merchant: string;
  token: string;
  tokenDecimals: bigint;
  price: bigint;
  billingCycle: bigint;
  priceInUsd: boolean;
  usdPrice: bigint;
  priceFeedAddress: string;
}

interface PlansState {
  plans: Plan[];
  reload: () => Promise<void>;
}

const PlansCtx = createContext<PlansState | undefined>(undefined);

export function PlansProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);

  async function load() {
    try {
      const contract = await getContract();
      const nextId: bigint = await contract.nextPlanId();
      const list: Plan[] = [];
      for (let i = 0n; i < nextId; i++) {
        const p = await contract.plans(i);
        list.push(p as Plan);
      }
      setPlans(list);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PlansCtx.Provider value={{ plans, reload: load }}>
      {children}
    </PlansCtx.Provider>
  );
}

export function usePlans() {
  const ctx = useContext(PlansCtx);
  if (!ctx) throw new Error('PlansProvider missing');
  return ctx;
}
