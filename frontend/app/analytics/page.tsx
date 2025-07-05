'use client';
import { useEffect, useState } from 'react';
import { getActiveSubscriptions, getPayments, getPlans } from '../../lib/subgraph';
import { useTranslation } from 'react-i18next';

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
  const [plans, setPlans] = useState<{ id: string; totalPaid: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

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
      <h1>{t('analytics.title')}</h1>
      {error && (
        <p className="error">
          {error} <button onClick={reload}>{t('analytics.retry')}</button>
        </p>
      )}
      {loading && <p>{t('generic.loading')}</p>}
      <h2>{t('analytics.active_subs')}</h2>
      {subs.length === 0 && <p>{t('analytics.no_active')}</p>}
      <ul className="list">
        {subs.map((s) => (
          <li key={s.id}>
            {s.user} plan {s.planId} next payment {s.nextPaymentDate}
          </li>
        ))}
      </ul>
      <h2>{t('analytics.plan_totals')}</h2>
      {plans.length === 0 && <p>{t('analytics.no_plans')}</p>}
      <ul className="list">
        {plans.map((p) => (
          <li key={p.id}>
            Plan {p.id} total paid {p.totalPaid}
          </li>
        ))}
      </ul>
      <h2>{t('analytics.payments')}</h2>
      {payments.length === 0 && <p>{t('analytics.no_payments')}</p>}
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
