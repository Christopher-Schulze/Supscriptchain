'use client';
import { useState } from 'react';
import { getContract } from '../../lib/contract';
import useWallet from '../../lib/useWallet';
import { useStore } from '../../lib/store';

export default function Payment() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');
  const [user, setUser] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setMessage } = useStore();

  async function trigger() {
    setLoading(true);
    try {
      if (!/^0x[0-9a-fA-F]{40}$/.test(user)) throw new Error('invalid user');
      if (!/^[0-9]+$/.test(planId) || Number(planId) < 0)
        throw new Error('invalid plan id');
      const contract = await getContract();
      const tx = await contract.processPayment(user, BigInt(planId));
      await tx.wait();
      setMessage({ text: `Payment processed! Tx: ${tx.hash}`, type: 'success' });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setMessage({ text: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Process Payment</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p>Processing...</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <div>
        <label>User: </label>
        <input value={user} onChange={e => setUser(e.target.value)} />
      </div>
      <div>
        <label>Plan ID: </label>
        <input value={planId} onChange={e => setPlanId(e.target.value)} />
      </div>
      <button onClick={trigger} disabled={loading}>Process</button>
    </div>
  );
}
