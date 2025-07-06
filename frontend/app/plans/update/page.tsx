'use client';
import { useState } from 'react';
import { updatePlan } from '../../../lib/contract';
import { validateAddress, validatePositiveInt } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';
import { useTranslation } from 'react-i18next';

export default function UpdatePlan() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('');
  const [billing, setBilling] = useState('');
  const [price, setPrice] = useState('');
  const [priceInUsd, setPriceInUsd] = useState(false);
  const [usdPrice, setUsdPrice] = useState('');
  const [feed, setFeed] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const { setMessage } = useStore();
  const { t } = useTranslation();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (!planId) throw new Error('plan id required');
      validatePositiveInt(planId, 'plan id');
      validatePositiveInt(billing, 'billing cycle');
      if (priceInUsd) {
        validatePositiveInt(usdPrice, 'USD price');
        validateAddress(feed, 'Price feed');
      } else {
        validatePositiveInt(price, 'Token price');
      }
      const tx = await updatePlan(
        BigInt(planId),
        BigInt(billing),
        BigInt(price || '0'),
        priceInUsd,
        BigInt(usdPrice || '0'),
        feed || '0x0000000000000000000000000000000000000000'
      );
      await tx.wait();
      setMessage({ text: t('messages.plan_updated_hash', { hash: tx.hash }), type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form" aria-busy={loading}>
      <h1>{t('update_plan.title')}</h1>
      {loading && <p aria-live="polite">{t('manage.processing')}</p>}
      {error && <p className="error">{error}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      <label htmlFor="update-plan-id">{t('update_plan.plan_id')}</label>
      <input
        id="update-plan-id"
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        required
      />
      <label htmlFor="update-billing">{t('update_plan.billing')}</label>
      <input
        id="update-billing"
        value={billing}
        onChange={(e) => setBilling(e.target.value)}
        required
      />
      <label>
        {t('update_plan.price_in_usd')}
        <input type="checkbox" checked={priceInUsd} onChange={e=>setPriceInUsd(e.target.checked)} />
      </label>
      {priceInUsd ? (
        <>
          <label htmlFor="update-usd-price">{t('update_plan.usd_price')}</label>
          <input
            id="update-usd-price"
            value={usdPrice}
            onChange={(e) => setUsdPrice(e.target.value)}
            required
          />
          <label htmlFor="update-price-feed">{t('update_plan.price_feed')}</label>
          <input
            id="update-price-feed"
            value={feed}
            onChange={(e) => setFeed(e.target.value)}
            required
          />
        </>
      ) : (
        <>
          <label htmlFor="update-token-price">{t('update_plan.token_price')}</label>
          <input
            id="update-token-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </>
      )}
      <button disabled={loading} onClick={submit}>{t('update_plan.submit')}</button>
    </div>
  );
}
