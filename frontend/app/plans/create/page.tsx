'use client';
import { useState } from 'react';
import { createPlan } from '../../../lib/contract';
import { validateAddress, validatePositiveInt } from '../../../lib/validation';
import useWallet from '../../../lib/useWallet';
import { useStore } from '../../../lib/store';

export default function CreatePlan() {
  const { account, connect } = useWallet();
  const [merchant, setMerchant] = useState('');
  const [token, setToken] = useState('');
  const [price, setPrice] = useState('');
  const [billing, setBilling] = useState('');
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
      if (merchant) validateAddress(merchant, 'Merchant');
      validateAddress(token, 'Token');
      validatePositiveInt(billing, 'Billing cycle');
      if (priceInUsd) {
        validatePositiveInt(usdPrice, 'USD price');
        validateAddress(feed, 'Price feed');
      } else {
        validatePositiveInt(price, 'Token price');
      }
      const tx = await createPlan(
        merchant || account || '0x0000000000000000000000000000000000000000',
        token,
        BigInt(price || '0'),
        BigInt(billing),
        priceInUsd,
        BigInt(usdPrice || '0'),
        feed || '0x0000000000000000000000000000000000000000'
      );
      await tx.wait();
      setMessage(`Plan created: ${tx.hash}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form">
      <h1>Create Plan</h1>
      {error && <p className="error">{error}</p>}
      {!account && <button onClick={connect}>Connect Wallet</button>}
      <label>
        Merchant
        <input value={merchant} onChange={e=>setMerchant(e.target.value)} />
      </label>
      <label>
        Token
        <input value={token} onChange={e=>setToken(e.target.value)} required />
      </label>
      <label>
        Billing (seconds)
        <input value={billing} onChange={e=>setBilling(e.target.value)} required />
      </label>
      <label>
        Price in USD
        <input type="checkbox" checked={priceInUsd} onChange={e=>setPriceInUsd(e.target.checked)} />
      </label>
      {priceInUsd ? (
        <>
          <label>
            USD Price (cents)
            <input value={usdPrice} onChange={e=>setUsdPrice(e.target.value)} required />
          </label>
          <label>
            Price Feed
            <input value={feed} onChange={e=>setFeed(e.target.value)} required />
          </label>
        </>
      ) : (
        <label>
          Token Price
          <input value={price} onChange={e=>setPrice(e.target.value)} required />
        </label>
      )}
      <button disabled={loading} onClick={submit}>Create</button>
    </div>
  );
}
