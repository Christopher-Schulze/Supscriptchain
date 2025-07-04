'use client';
import { useState } from 'react';
import { updatePlan } from '../../../lib/contract';
import { validateAddress, validatePositiveInt } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';

export default function UpdatePlan() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('');
  const [billing, setBilling] = useState('');
  const [price, setPrice] = useState('');
  const [priceInUsd, setPriceInUsd] = useState(false);
  const [usdPrice, setUsdPrice] = useState('');
  const [feed, setFeed] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const { setMessage } = useStore();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (!planId) throw new Error('plan id required');
      validatePositiveInt(planId, 'plan id');
      validatePositiveInt(billing, 'billing cycle');
      if (priceInUsd) {
        validatePositiveInt(usdPrice, 'USD price');
        validateAddress(feed, 'Price feed');
      } else {
        validatePositiveInt(price, 'Token price');
      }
      const tx = await updatePlan(
        BigInt(planId),
        BigInt(billing),
        BigInt(price || '0'),
        priceInUsd,
        BigInt(usdPrice || '0'),
        feed || '0x0000000000000000000000000000000000000000'
      );
      await tx.wait();
      setMessage({ text: `Plan updated: ${tx.hash}`, type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form">
      <h1>Update Plan</h1>
      {error && <p className="error">{error}</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <label htmlFor="update-plan-id">Plan ID</label>
      <input
        id="update-plan-id"
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        required
      />
      <label htmlFor="update-billing">Billing (seconds)</label>
      <input
        id="update-billing"
        value={billing}
        onChange={(e) => setBilling(e.target.value)}
        required
      />
      <label>
        Price in USD
        <input type="checkbox" checked={priceInUsd} onChange={e=>setPriceInUsd(e.target.checked)} />
      </label>
      {priceInUsd ? (
        <>
          <label htmlFor="update-usd-price">USD Price (cents)</label>
          <input
            id="update-usd-price"
            value={usdPrice}
            onChange={(e) => setUsdPrice(e.target.value)}
            required
          />
          <label htmlFor="update-price-feed">Price Feed</label>
          <input
            id="update-price-feed"
            value={feed}
            onChange={(e) => setFeed(e.target.value)}
            required
          />
        </>
      ) : (
        <>
          <label htmlFor="update-token-price">Token Price</label>
          <input
            id="update-token-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </>
      )}
      <button disabled={loading} onClick={submit}>Update</button>
    </div>
  );
}
