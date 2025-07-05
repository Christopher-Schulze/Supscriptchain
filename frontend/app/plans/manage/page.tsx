'use client';
import { useState } from 'react';
import { updatePlan, updateMerchant, disablePlan } from '../../../lib/contract';
import { validateAddress } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';
import { usePlans } from '../../../lib/plansStore';

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
      setMessage({ text: 'Plan updated', type: 'success' });
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
      setMessage({ text: 'Merchant updated', type: 'success' });
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
      setMessage({ text: 'Plan disabled', type: 'success' });
      await reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form">
      <h1>Manage Plans</h1>
      {!account && <button onClick={connect}>Connect Wallet</button>}
      {error && <p className="error">{error}</p>}
      <label htmlFor="plan-select">Select Plan</label>
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
          <label htmlFor="manage-billing">Billing (seconds)</label>
          <input
            id="manage-billing"
            value={billing}
            onChange={(e) => setBilling(e.target.value)}
          />
          <label htmlFor="manage-price">Token Price</label>
          <input
            id="manage-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <label htmlFor="manage-merchant">Merchant</label>
          <input
            id="manage-merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
          <button disabled={loading} onClick={submit}>
            Update
          </button>
          <button disabled={loading} onClick={changeMerchant}>
            Merchant ändern
          </button>
          <button disabled={loading} onClick={deactivatePlan}>
            Plan deaktivieren
          </button>
        </>
      )}
    </div>
  );
}
