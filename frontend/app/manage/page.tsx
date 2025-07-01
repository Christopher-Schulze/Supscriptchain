'use client';
import { useState } from 'react';
import { getContract } from '../../lib/contract';
import useWallet from '../../lib/useWallet';

export default function Manage() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.subscribe(BigInt(planId));
      await tx.wait();
      alert(`Subscribed! Tx: ${tx.hash}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      alert(`Subscription failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.cancelSubscription(BigInt(planId));
      await tx.wait();
      alert(`Cancelled! Tx: ${tx.hash}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      alert(`Cancellation failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Manage Subscription</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Processing...</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <div>
        <label>Plan ID: </label>
        <input value={planId} onChange={e => setPlanId(e.target.value)} />
      </div>
      <button onClick={subscribe} disabled={loading}>Subscribe</button>
      <button onClick={cancel} disabled={loading}>Cancel</button>
    </div>
  );
}
