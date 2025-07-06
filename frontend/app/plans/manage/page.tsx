'use client';
import { useState } from 'react';
import { updatePlan, updateMerchant, disablePlan } from '../../../lib/contract';
import { validateAddress } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';
import { usePlans } from '../../../lib/plansStore';
import { useTranslation } from 'react-i18next';

export default function ManagePlans() {
  const { account, connect } = useWallet();
  const { setMessage } = useStore();
  const { plans, reload } = usePlans();
  const [selected, setSelected] = useState<number | null>(null);
  const [billing, setBilling] = useState('');
  const [price, setPrice] = useState('');
  const [merchant, setMerchant] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (selected === null) return;
    setLoading(true);
    setError(null);
    try {
      if (!billing || Number(billing) <= 0) throw new Error('billing > 0');
      const tx = await updatePlan(
        BigInt(selected),
        BigInt(billing),
        BigInt(price || '0'),
        false,
        0n,
        '0x0000000000000000000000000000000000000000',
      );
      await tx.wait();
      setMessage({ text: t('messages.plan_updated'), type: 'success' });
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function changeMerchant() {
    if (selected === null) return;
    setLoading(true);
    setError(null);
    try {
      validateAddress(merchant, 'Merchant');
      const tx = await updateMerchant(BigInt(selected), merchant);
      await tx.wait();
      setMessage({ text: t('messages.merchant_updated'), type: 'success' });
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function deactivatePlan() {
    if (selected === null) return;
    setLoading(true);
    setError(null);
    try {
      const tx = await disablePlan(BigInt(selected));
      await tx.wait();
      setMessage({ text: t('messages.plan_disabled'), type: 'success' });
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const { t } = useTranslation();
  return (
    <div className="form" aria-busy={loading}>
      <h1>{t('manage_plans.title')}</h1>
      {loading && <p aria-live="polite">{t('manage.processing')}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      {error && <p className="error">{error}</p>}
      <label htmlFor="plan-select">{t('manage_plans.select_plan')}</label>
      <select
        id="plan-select"
        value={selected ?? ''}
        onChange={(e) => setSelected(Number(e.target.value))}
      >
        <option value="">-</option>
        {plans.map((_, idx) => (
          <option key={idx} value={idx}>{`Plan ${idx}`}</option>
        ))}
      </select>
      {selected !== null && (
        <>
          <label htmlFor="manage-billing">{t('manage_plans.billing')}</label>
          <input
            id="manage-billing"
            value={billing}
            onChange={(e) => setBilling(e.target.value)}
          />
          <label htmlFor="manage-price">{t('manage_plans.price')}</label>
          <input
            id="manage-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <label htmlFor="manage-merchant">{t('manage_plans.merchant')}</label>
          <input
            id="manage-merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
          <button disabled={loading} onClick={submit}>
            {t('manage_plans.update')}
          </button>
          <button disabled={loading} onClick={changeMerchant}>
            {t('manage_plans.update_merchant')}
          </button>
          <button disabled={loading} onClick={deactivatePlan}>
            {t('manage_plans.disable')}
          </button>
        </>
      )}
    </div>
  );
}
