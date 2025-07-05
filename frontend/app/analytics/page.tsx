'use client';
import { useEffect, useState } from 'react';
import {
  getActiveSubscriptions,
  getPayments,
  getPlans,
  getRevenue,
} from '../../lib/subgraph';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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
  const [revenue, setRevenue] = useState<{ planId: string; amount: string }[]>(
    [],
  );
  const [filterPlan, setFilterPlan] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
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

  async function applyFilters() {
    setError(null);
    setLoading(true);
    try {
      const rev = await getRevenue(
        filterPlan || undefined,
        from ? Number(from) : undefined,
        to ? Number(to) : undefined,
      );
      setRevenue(rev);
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
      {plans.length > 0 && (
        <Bar
          data={{
            labels: plans.map((p) => p.id),
            datasets: [
              {
                label: 'Total Paid',
                data: plans.map((p) => Number(p.totalPaid)),
                backgroundColor: 'rgba(75,192,192,0.4)',
              },
            ],
          }}
        />
      )}
      <h2>Revenue</h2>
      <div>
        <label htmlFor="filter-plan">Plan ID: </label>
        <input
          id="filter-plan"
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
        />
        <label htmlFor="from-time">From (unix): </label>
        <input
          id="from-time"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <label htmlFor="to-time">To (unix): </label>
        <input
          id="to-time"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button onClick={applyFilters}>Apply</button>
      </div>
      {revenue.length > 0 && (
        <Bar
          data={{
            labels: revenue.map((_, i) => String(i + 1)),
            datasets: [
              {
                label: 'Amount',
                data: revenue.map((r) => Number(r.amount)),
                backgroundColor: 'rgba(153,102,255,0.4)',
              },
            ],
          }}
        />
      )}
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
