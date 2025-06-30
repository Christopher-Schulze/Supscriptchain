'use client';
import { useEffect, useState } from 'react';
import { getActiveSubscriptions, getPayments } from '../../lib/subgraph';

interface SubscriptionData {
  id: string;
  user: string;
  planId: string;
  nextPaymentDate: string;
}

interface PaymentData {
  id: string;
  user: string;
  planId: string;
  amount: string;
}

export default function Analytics() {
  const [subs, setSubs] = useState<SubscriptionData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [s, p] = await Promise.all([
          getActiveSubscriptions(),
          getPayments(),
        ]);
        setSubs(s);
        setPayments(p);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1>Analytics</h1>
      <h2>Active Subscriptions</h2>
      <ul>
        {subs.map((s) => (
          <li key={s.id}>
            {s.user} plan {s.planId} next payment {s.nextPaymentDate}
          </li>
        ))}
      </ul>
      <h2>Payments</h2>
      <ul>
        {payments.map((p) => (
          <li key={p.id}>
            {p.user} plan {p.planId} amount {p.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}
