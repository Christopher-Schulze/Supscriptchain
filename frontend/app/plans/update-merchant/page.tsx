'use client';
import { useState } from 'react';
import { updateMerchant } from '../../../lib/contract';
import { validateAddress, validatePositiveInt } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';
import { useTranslation } from 'react-i18next';

export default function UpdateMerchant() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setMessage } = useStore();
  const { t } = useTranslation();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      validatePositiveInt(planId, 'plan id');
      validateAddress(merchant, 'Merchant');
      const tx = await updateMerchant(BigInt(planId), merchant);
      await tx.wait();
      setMessage({ text: t('messages.merchant_updated_hash', { hash: tx.hash }), type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form" aria-busy={loading}>
      <h1>{t('update_merchant.title')}</h1>
      {loading && <p aria-live="polite">{t('manage.processing')}</p>}
      {error && <p className="error">{error}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      <label htmlFor="merchant-plan-id">{t('update_merchant.plan_id')}</label>
      <input
        id="merchant-plan-id"
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
      />
      <label htmlFor="new-merchant">{t('update_merchant.new_merchant')}</label>
      <input
        id="new-merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
      />
      <button disabled={loading} onClick={submit}>{t('update_merchant.submit')}</button>
    </div>
  );
}
