'use client';
import { useEffect, useState } from 'react';
import { getActiveSubscriptions, getPayments, getPlans } from '../../lib/subgraph';
import type { Subscription, Payment, Plan } from '../../generated/graphql';


export default function Analytics() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, p, pl] = await Promise.all([
          getActiveSubscriptions(),
          getPayments(),
          getPlans(),
        ]);
        setSubs(s);
        setPayments(p);
        setPlans(pl);
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
      const [s, p, pl] = await Promise.all([
        getActiveSubscriptions(),
        getPayments(),
        getPlans(),
      ]);
      setSubs(s);
      setPayments(p);
      setPlans(pl);
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
        <p className="error">
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
      <h2>Plan Totals</h2>
      {plans.length === 0 && <p>No plans</p>}
      <ul className="list">
        {plans.map((p) => (
          <li key={p.id}>
            Plan {p.id} total paid {p.totalPaid}
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
