'use client';
import { useState } from 'react';
import { getContract } from '../../lib/contract';
import useWallet from '../../lib/useWallet';

export default function Manage() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');

  async function subscribe() {
    try {
      const contract = await getContract();
      await contract.subscribe(BigInt(planId));
    } catch (err) {
      console.error(err);
    }
  }

  async function cancel() {
    try {
      const contract = await getContract();
      await contract.cancelSubscription(BigInt(planId));
    } catch (err) {
      console.error(err);
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
      <button onClick={subscribe}>Subscribe</button>
      <button onClick={cancel}>Cancel</button>
    </div>
  );
}
