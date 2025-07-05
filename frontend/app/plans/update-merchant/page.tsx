'use client';
import { useState } from 'react';
import { updateMerchant } from '../../../lib/contract';
import { validateAddress, validatePositiveInt } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';

export default function UpdateMerchant() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setMessage } = useStore();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      validatePositiveInt(planId, 'plan id');
      validateAddress(merchant, 'Merchant');
      const tx = await updateMerchant(BigInt(planId), merchant);
      await tx.wait();
      setMessage({ text: `Merchant updated: ${tx.hash}`, type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form">
      <h1>Update Merchant</h1>
      {error && <p className="error">{error}</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <label htmlFor="merchant-plan-id">Plan ID</label>
      <input
        id="merchant-plan-id"
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
      />
      <label htmlFor="new-merchant">New Merchant</label>
      <input
        id="new-merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
      />
      <button disabled={loading} onClick={submit}>Update</button>
    </div>
  );
}
