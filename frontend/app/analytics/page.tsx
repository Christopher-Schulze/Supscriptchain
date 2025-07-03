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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([
          getActiveSubscriptions(),
          getPayments(),
        ]);
        setSubs(s);
        setPayments(p);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function reload() {
    setError(null);
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        getActiveSubscriptions(),
        getPayments(),
      ]);
      setSubs(s);
      setPayments(p);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Analytics</h1>
      {error && (
        <p style={{ color: 'red' }}>
          {error} <button onClick={reload}>Retry</button>
        </p>
      )}
      {loading && <p>Loading...</p>}
      <h2>Active Subscriptions</h2>
      {subs.length === 0 && <p>No active subscriptions</p>}
      <ul className="list">
        {subs.map((s) => (
          <li key={s.id}>
            {s.user} plan {s.planId} next payment {s.nextPaymentDate}
          </li>
        ))}
      </ul>
      <h2>Payments</h2>
      {payments.length === 0 && <p>No payments</p>}
      <ul className="list">
        {payments.map((p) => (
          <li key={p.id}>
            {p.user} plan {p.planId} amount {p.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}
