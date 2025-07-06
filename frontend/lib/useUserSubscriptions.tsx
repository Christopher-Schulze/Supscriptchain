'use client';
import { useState, useEffect } from 'react';
import { getContract } from './contract';
import useWallet from './useWallet';
import { env } from './env';

export interface UserSubscription {
  planId: bigint;
  nextPaymentDate: bigint;
  isActive: boolean;
}

export default function useUserSubscriptions() {
  const { account } = useWallet();
  const [subs, setSubs] = useState<UserSubscription[]>([]);

  async function load() {
    if (!account) {
      setSubs([]);
      return;
    }
    try {
      const contract = await getContract();
      const nextId: bigint = await contract.nextPlanId();
      const list: UserSubscription[] = [];
      for (let i = 0n; i < nextId; i++) {
        const sub = await contract.userSubscriptions(account, i);
        if (sub.subscriber !== '0x0000000000000000000000000000000000000000') {
          list.push({
            planId: i,
            nextPaymentDate: sub.nextPaymentDate,
            isActive: sub.isActive,
          });
        }
      }
      setSubs(list);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, env.NEXT_PUBLIC_REFRESH_INTERVAL * 1000);
    return () => clearInterval(id);
  }, [account]);

  return { subs, reload: load };
}
