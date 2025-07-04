'use client';
import { useState } from 'react';
import { updatePlan } from '../../../lib/contract';
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
        '0x0000000000000000000000000000000000000000'
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

  return (
    <div className="form">
      <h1>Manage Plans</h1>
      {!account && <button onClick={connect}>Connect Wallet</button>}
      {error && <p className="error">{error}</p>}
      <label>
        Select Plan
        <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value))}>
          <option value="">-</option>
          {plans.map((_, idx) => (
            <option key={idx} value={idx}>{`Plan ${idx}`}</option>
          ))}
        </select>
      </label>
      {selected !== null && (
        <>
          <label>
            Billing (seconds)
            <input value={billing} onChange={e => setBilling(e.target.value)} />
          </label>
          <label>
            Token Price
            <input value={price} onChange={e => setPrice(e.target.value)} />
          </label>
          <button disabled={loading} onClick={submit}>Update</button>
        </>
      )}
    </div>
  );
}
