'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { formatUnits } from 'ethers';
import { getContract } from './contract';
import { env } from './env';

export interface Plan {
  id: bigint;
  merchant: string;
  token: string;
  tokenDecimals: bigint;
  price: string;
  billingCycle: bigint;
  priceInUsd: boolean;
  usdPrice: bigint;
  priceFeedAddress: string;
  active: boolean;
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
        list.push({
          id: i,
          merchant: p.merchant,
          token: p.token,
          tokenDecimals: p.tokenDecimals,
          price: formatUnits(p.price, Number(p.tokenDecimals)),
          billingCycle: p.billingCycle,
          priceInUsd: p.priceInUsd,
          usdPrice: p.usdPrice,
          priceFeedAddress: p.priceFeedAddress,
          active: p.active,
        });
      }
      setPlans(list);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, env.NEXT_PUBLIC_REFRESH_INTERVAL * 1000);
    return () => clearInterval(id);
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
