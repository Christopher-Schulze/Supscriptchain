'use client';
import { useState } from 'react';
import { getContract } from '../../lib/contract';
import useWallet from '../../lib/useWallet';

export default function Payment() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');
  const [user, setUser] = useState('');

  async function trigger() {
    try {
      const contract = await getContract();
      await contract.processPayment(user, BigInt(planId));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <h1>Process Payment</h1>
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <div>
        <label>User: </label>
        <input value={user} onChange={e => setUser(e.target.value)} />
      </div>
      <div>
        <label>Plan ID: </label>
        <input value={planId} onChange={e => setPlanId(e.target.value)} />
      </div>
      <button onClick={trigger}>Process</button>
    </div>
  );
}
