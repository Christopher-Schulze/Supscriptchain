'use client';
import { useState } from 'react';
import { usePlans } from '../../lib/plansStore';
import useWallet from '../../lib/useWallet';

export default function Plans() {
  const { account, connect } = useWallet();
  const { plans } = usePlans();
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [selected, setSelected] = useState<bigint | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const filtered = plans.filter((p) =>
    filter === 'all' ? true : filter === 'active' ? p.active : !p.active,
  );
  const sorted = [...filtered].sort((a, b) => {
    const ap = Number(a.price);
    const bp = Number(b.price);
    return sort === 'asc' ? ap - bp : bp - ap;
  });
  const detail = selected !== null ? plans.find((p) => p.id === selected) : null;

  return (
    <div>
      <h1>Available Plans</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <div style={{ marginBottom: 10 }}>
        <a href="/plans/create">Create Plan</a> |{' '}
        <a href="/plans/manage">Manage Plans</a>
      </div>
      <label htmlFor="filter">Filter</label>
      <select
        id="filter"
        value={filter}
        onChange={(e) =>
          setFilter(e.target.value as 'all' | 'active' | 'inactive')
        }
        style={{ marginLeft: 4, marginRight: 10 }}
      >
        <option value="all">Alle</option>
        <option value="active">Aktiv</option>
        <option value="inactive">Inaktiv</option>
      </select>
      <label htmlFor="sort">Sortierung</label>
      <select
        id="sort"
        value={sort}
        onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
        style={{ marginLeft: 4 }}
      >
        <option value="asc">Preis aufsteigend</option>
        <option value="desc">Preis absteigend</option>
      </select>
      <ul className="list">
        {sorted.map((p) => (
          <li key={p.id.toString()}>
            <button onClick={() => setSelected(p.id)}>
              Plan {p.id.toString()}: token {p.token} price {p.price.toString()} billing {p.billingCycle.toString()}s {p.active ? '(active)' : '(inactive)'}
            </button>
          </li>
        ))}
      </ul>
      {detail && (
        <div data-testid="plan-details">
          <h2>Plan Details</h2>
          <ul className="list">
            <li>ID: {detail.id.toString()}</li>
            <li>Merchant: {detail.merchant}</li>
            <li>Token: {detail.token}</li>
            <li>Price: {detail.price.toString()}</li>
            <li>Billing: {detail.billingCycle.toString()}s</li>
            <li>Active: {detail.active ? 'true' : 'false'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
