'use client';
import { useState } from 'react';
import * as Form from '@radix-ui/react-form';
import { usePlans } from '../../lib/plansStore';
import useWallet from '../../lib/useWallet';
import { useTranslation } from 'react-i18next';
import Price from '../../lib/Price';

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
    <div className="container" aria-busy={loading}>
      <h1>{t('plans.title')}</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p aria-live="polite">{t('generic.loading')}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      <div className="top-links">
        <a href="/plans/create">{t('nav.create_plan')}</a> |{' '}
        <a href="/plans/manage">{t('nav.manage_plans')}</a>
      </div>
      <Form.Root
        onSubmit={(e) => e.preventDefault()}
        className="filter-form"
      >
        <Form.Field name="filter" className="field">
          <Form.Label htmlFor="filter">{t('plans.filter')}</Form.Label>
          <Form.Control asChild>
            <select
              id="filter"
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
            >
              <option value="all">{t('plans.filter_all')}</option>
              <option value="active">{t('plans.filter_active')}</option>
              <option value="inactive">{t('plans.filter_inactive')}</option>
            </select>
          </Form.Control>
        </Form.Field>
        <Form.Field name="sort" className="field">
          <Form.Label htmlFor="sort">{t('plans.sort')}</Form.Label>
          <Form.Control asChild>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">{t('plans.sort_asc')}</option>
              <option value="desc">{t('plans.sort_desc')}</option>
            </select>
          </Form.Control>
        </Form.Field>
      </Form.Root>
      <ul className="list">
        {sorted.map((p) => (
          <li key={p.id.toString()}>
            <button
              onClick={() => setSelected(p.id)}
              aria-expanded={selected === p.id}
              aria-controls="plan-details"
            >
              {`Plan ${p.id.toString()}: `}
              <Price amount={p.price} decimals={p.tokenDecimals} symbol={p.token} />
              {` alle ${
                p.billingCycle % 86400n === 0n
                  ? `${p.billingCycle / 86400n}\u202Fd`
                  : `${p.billingCycle.toString()}s`
              } ${p.active ? t('plans.status_active') : t('plans.status_inactive')}`}
            </button>
          </li>
        ))}
      </ul>
      {detail && (
        <div id="plan-details" data-testid="plan-details">
          <h2>{t('plans.details_title')}</h2>
          <ul className="list">
            <li>{t('plans.detail_id')}: {detail.id.toString()}</li>
            <li>{t('plans.detail_merchant')}: {detail.merchant}</li>
            <li>{t('plans.detail_token')}: {detail.token}</li>
            <li>
              {t('plans.detail_price')}: 
              <Price amount={detail.price} decimals={detail.tokenDecimals} symbol={detail.token} />
            </li>
            <li>
              {t('plans.detail_billing')}: 
              {detail.billingCycle % 86400n === 0n
                ? `${detail.billingCycle / 86400n}\u202Fd`
                : `${detail.billingCycle.toString()}s`}
            </li>
            <li>{t('plans.detail_active')}: {detail.active ? 'true' : 'false'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
