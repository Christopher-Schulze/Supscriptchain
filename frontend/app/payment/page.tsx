'use client';
import { useState } from 'react';
import { getContract } from '../../lib/contract';
import useWallet from '../../lib/useWallet';

export default function Payment() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');
  const [user, setUser] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function trigger() {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.processPayment(user, BigInt(planId));
      await tx.wait();
      alert(`Payment processed! Tx: ${tx.hash}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      alert(`Payment failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Process Payment</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
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
