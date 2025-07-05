'use client';
import { useState } from 'react';
import { usePlans } from '../../lib/plansStore';
import useWallet from '../../lib/useWallet';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('plans.title')}</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p>{t('generic.loading')}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      <div style={{ marginBottom: 10 }}>
        <a href="/plans/create">{t('nav.create_plan')}</a> |{' '}
        <a href="/plans/manage">{t('nav.manage_plans')}</a>
      </div>
      <label htmlFor="filter">{t('plans.filter')}</label>
      <select
        id="filter"
        value={filter}
        onChange={(e) =>
          setFilter(e.target.value as 'all' | 'active' | 'inactive')
        }
        style={{ marginLeft: 4, marginRight: 10 }}
      >
        <option value="all">{t('plans.filter_all')}</option>
        <option value="active">{t('plans.filter_active')}</option>
        <option value="inactive">{t('plans.filter_inactive')}</option>
      </select>
      <label htmlFor="sort">{t('plans.sort')}</label>
      <select
        id="sort"
        value={sort}
        onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
        style={{ marginLeft: 4 }}
      >
        <option value="asc">{t('plans.sort_asc')}</option>
        <option value="desc">{t('plans.sort_desc')}</option>
      </select>
      <ul className="list">
        {sorted.map((p) => (
          <li key={p.id.toString()}>
            <button onClick={() => setSelected(p.id)}>
              {`Plan ${p.id.toString()}: token ${p.token} price ${p.price.toString()} billing ${p.billingCycle.toString()}s ${p.active ? t('plans.status_active') : t('plans.status_inactive')}`}
            </button>
          </li>
        ))}
      </ul>
      {detail && (
        <div data-testid="plan-details">
          <h2>{t('plans.details_title')}</h2>
          <ul className="list">
            <li>{t('plans.detail_id')}: {detail.id.toString()}</li>
            <li>{t('plans.detail_merchant')}: {detail.merchant}</li>
            <li>{t('plans.detail_token')}: {detail.token}</li>
            <li>{t('plans.detail_price')}: {detail.price.toString()}</li>
            <li>{t('plans.detail_billing')}: {detail.billingCycle.toString()}s</li>
            <li>{t('plans.detail_active')}: {detail.active ? 'true' : 'false'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
