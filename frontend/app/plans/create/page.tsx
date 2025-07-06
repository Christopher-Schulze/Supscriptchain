'use client';
import { useState } from 'react';
import { createPlan } from '../../../lib/contract';
import { validateAddress, validatePositiveInt } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';
import { useTranslation } from 'react-i18next';

export default function CreatePlan() {
  const { account, connect } = useWallet();
  const [merchant, setMerchant] = useState('');
  const [token, setToken] = useState('');
  const [price, setPrice] = useState('');
  const [billing, setBilling] = useState('');
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
      if (merchant) validateAddress(merchant, 'Merchant');
      validateAddress(token, 'Token');
      validatePositiveInt(billing, 'Billing cycle');
      if (priceInUsd) {
        validatePositiveInt(usdPrice, 'USD price');
        validateAddress(feed, 'Price feed');
      } else {
        validatePositiveInt(price, 'Token price');
      }
      const tx = await createPlan(
        merchant || account || '0x0000000000000000000000000000000000000000',
        token,
        BigInt(price || '0'),
        BigInt(billing),
        priceInUsd,
        BigInt(usdPrice || '0'),
        feed || '0x0000000000000000000000000000000000000000'
      );
      await tx.wait();
      setMessage({ text: t('messages.plan_created', { hash: tx.hash }), type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form" aria-busy={loading}>
      <h1>{t('create.title')}</h1>
      {loading && <p aria-live="polite">{t('manage.processing')}</p>}
      {error && <p className="error">{error}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      <label htmlFor="merchant">{t('create.merchant')}</label>
      <input
        id="merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
      />
      <label htmlFor="token">{t('create.token')}</label>
      <input
        id="token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
      />
      <label htmlFor="billing">{t('create.billing')}</label>
      <input
        id="billing"
        value={billing}
        onChange={(e) => setBilling(e.target.value)}
        required
      />
      <label>
        {t('create.price_in_usd')}
        <input type="checkbox" checked={priceInUsd} onChange={e=>setPriceInUsd(e.target.checked)} />
      </label>
      {priceInUsd ? (
        <>
          <label htmlFor="usd-price">{t('create.usd_price')}</label>
          <input
            id="usd-price"
            value={usdPrice}
            onChange={(e) => setUsdPrice(e.target.value)}
            required
          />
          <label htmlFor="price-feed">{t('create.price_feed')}</label>
          <input
            id="price-feed"
            value={feed}
            onChange={(e) => setFeed(e.target.value)}
            required
          />
        </>
      ) : (
        <>
          <label htmlFor="token-price">{t('create.token_price')}</label>
          <input
            id="token-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </>
      )}
      <button disabled={loading} onClick={submit}>{t('create.submit')}</button>
    </div>
  );
}
