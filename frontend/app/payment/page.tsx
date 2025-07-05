'use client';
import { useState } from 'react';
import {
  getContract,
  processPayment as contractProcessPayment,
} from '../../lib/contract';
import useWallet from '../../lib/useWallet';
import { useStore } from '../../lib/store';

export default function Payment() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setMessage } = useStore();

  async function trigger() {
    setLoading(true);
    setError(null);
    try {
      if (!/^0x[0-9a-fA-F]{40}$/.test(user)) throw new Error('invalid user');
      if (!/^[0-9]+$/.test(planId) || Number(planId) < 0)
        throw new Error('invalid plan id');
      const tx = await contractProcessPayment(user, BigInt(planId));
      await tx.wait();
      setMessage({ text: `Payment processed! Tx: ${tx.hash}`, type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
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
        <label htmlFor="pay-user">User: </label>
        <input
          id="pay-user"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="pay-plan">Plan ID: </label>
        <input
          id="pay-plan"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        />
      </div>
      <button onClick={trigger} disabled={loading}>Process</button>
    </div>
  );
}
