'use client';
import { useState } from 'react';
import { ethers } from 'ethers';
import { getContract, subscribeWithPermit } from '../../lib/contract';
import { AggregatorV3Interface__factory } from 'typechain/factories/contracts/interfaces/AggregatorV3Interface__factory';
import useWallet from '../../lib/useWallet';
import { useStore } from '../../lib/store';

export default function Manage() {
  const { account, connect } = useWallet();
  const { setMessage } = useStore();
  const [planId, setPlanId] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [v, setV] = useState('');
  const [r, setR] = useState('');
  const [s, setS] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    setLoading(true);
    try {
      if (!/^[0-9]+$/.test(planId)) throw new Error('invalid plan id');
      const contract = await getContract();
      const tx = await contract.subscribe(BigInt(planId));
      await tx.wait();
      setMessage(`Subscribed! Tx: ${tx.hash}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    setLoading(true);
    try {
      if (!/^[0-9]+$/.test(planId)) throw new Error('invalid plan id');
      const contract = await getContract();
      const tx = await contract.cancelSubscription(BigInt(planId));
      await tx.wait();
      setMessage(`Cancelled! Tx: ${tx.hash}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function requestPermit() {
    if (!account) return setMessage('Connect Wallet first');
    setLoading(true);
    setError(null);
    try {
      if (!/^[0-9]+$/.test(planId)) throw new Error('invalid plan id');
      if (!/^[0-9]+$/.test(deadline)) throw new Error('invalid deadline');
      const contract = await getContract();
      const plan = await contract.plans(BigInt(planId));
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const token = new ethers.Contract(
        plan.token,
        ['function name() view returns (string)', 'function nonces(address) view returns (uint256)'],
        provider
      );
      const tokenName: string = await token.name();
      const nonce: bigint = await token.nonces(account);
      const chainId = await signer.getChainId();
      let amount: bigint = plan.price;
      if (plan.priceInUsd) {
        const feed = AggregatorV3Interface__factory.connect(plan.priceFeedAddress, provider);
        const [, price,,] = await feed.latestRoundData();
        const decimals = await feed.decimals();
        amount = (plan.usdPrice * (10n ** plan.tokenDecimals) * (10n ** BigInt(decimals))) / (100n * BigInt(price));
      }
      const domain = { name: tokenName, version: '1', chainId, verifyingContract: plan.token };
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      } as const;
      const values = { owner: account, spender: contract.target, value: amount, nonce, deadline: BigInt(deadline) };
      const signature = await signer.signTypedData(domain, types, values);
      const sig = ethers.Signature.from(signature);
      setV(sig.v.toString());
      setR(sig.r);
      setS(sig.s);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function subscribePermit() {
    setLoading(true);
    setError(null);
    try {
      if (!/^[0-9]+$/.test(planId)) throw new Error('invalid plan id');
      if (!/^[0-9]+$/.test(deadline)) throw new Error('invalid deadline');
      if (!/^[0-9]+$/.test(v)) throw new Error('invalid v');
      if (!/^0x[0-9a-fA-F]{64}$/.test(r)) throw new Error('invalid r');
      if (!/^0x[0-9a-fA-F]{64}$/.test(s)) throw new Error('invalid s');
      const tx = await subscribeWithPermit(
        BigInt(planId),
        BigInt(deadline),
        Number(v),
        r as `0x${string}`,
        s as `0x${string}`
      );
      await tx.wait();
      setMessage(`Subscribed with permit! Tx: ${tx.hash}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
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
      <div>
        <label>Deadline (unix secs): </label>
        <input value={deadline} onChange={e => setDeadline(e.target.value)} />
      </div>
      <div>
        <label>v: </label>
        <input value={v} onChange={e => setV(e.target.value)} />
      </div>
      <div>
        <label>r: </label>
        <input value={r} onChange={e => setR(e.target.value)} />
      </div>
      <div>
        <label>s: </label>
        <input value={s} onChange={e => setS(e.target.value)} />
      </div>
      <button onClick={requestPermit} disabled={loading || !account}>Get Permit Signature</button>
      <button onClick={subscribePermit} disabled={loading}>Subscribe with Permit</button>
      <button onClick={subscribe} disabled={loading}>Subscribe</button>
      <button onClick={cancel} disabled={loading}>Cancel</button>
    </div>
  );
}
