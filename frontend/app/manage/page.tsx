'use client';
import { useState } from 'react';
import { getContract } from '../../lib/contract';
import useWallet from '../../lib/useWallet';

export default function Manage() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');
  const [loadingSub, setLoadingSub] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  async function subscribe() {
    setLoadingSub(true);
    try {
      const contract = await getContract();
      const tx = await contract.subscribe(BigInt(planId));
      await tx.wait();
      alert(`Subscribed. Tx: ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Transaction failed');
    } finally {
      setLoadingSub(false);
    }
  }

  async function cancel() {
    setLoadingCancel(true);
    try {
      const contract = await getContract();
      const tx = await contract.cancelSubscription(BigInt(planId));
      await tx.wait();
      alert(`Subscription cancelled. Tx: ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Transaction failed');
    } finally {
      setLoadingCancel(false);
    }
  }

  return (
    <div>
      <h1>Manage Subscription</h1>
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <div>
        <label>Plan ID: </label>
        <input value={planId} onChange={e => setPlanId(e.target.value)} />
      </div>
      <button onClick={subscribe} disabled={loadingSub}>
        {loadingSub ? 'Subscribing...' : 'Subscribe'}
      </button>
      <button onClick={cancel} disabled={loadingCancel}>
        {loadingCancel ? 'Cancelling...' : 'Cancel'}
      </button>
    </div>
  );
}
