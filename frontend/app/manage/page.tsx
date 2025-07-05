'use client';
import { useState } from 'react';
import { ethers } from 'ethers';
import {
  getContract,
  subscribeWithPermit,
  subscribe as contractSubscribe,
  cancelSubscription as contractCancel,
} from '../../lib/contract';
import { AggregatorV3Interface__factory } from 'typechain/factories/contracts/interfaces/AggregatorV3Interface__factory';
import useWallet from '../../lib/useWallet';
import { useStore } from '../../lib/store';
import useUserSubscriptions from '../../lib/useUserSubscriptions';
import { useTranslation } from 'react-i18next';

export default function Manage() {
  const { account, connect } = useWallet();
  const { setMessage } = useStore();
  const { subs } = useUserSubscriptions();
  const [planId, setPlanId] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [v, setV] = useState('');
  const [r, setR] = useState('');
  const [s, setS] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      if (!/^[0-9]+$/.test(planId)) throw new Error('invalid plan id');
      const tx = await contractSubscribe(BigInt(planId));
      await tx.wait();
      setMessage({ text: `Subscribed! Tx: ${tx.hash}`, type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    setLoading(true);
    setError(null);
    try {
      if (!/^[0-9]+$/.test(planId)) throw new Error('invalid plan id');
      const tx = await contractCancel(BigInt(planId));
      await tx.wait();
      setMessage({ text: `Cancelled! Tx: ${tx.hash}`, type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function requestPermit() {
    if (!account) return setMessage({ text: t('generic.connect_wallet'), type: 'warning' });
    setLoading(true);
    setError(null);
    try {
      if (!/^[0-9]+$/.test(planId)) throw new Error('invalid plan id');
      if (!/^[0-9]+$/.test(deadline)) throw new Error('invalid deadline');
      const contract = await getContract();
      const plan = await contract.plans(BigInt(planId));
      const provider = new ethers.BrowserProvider(
        (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum,
      );
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
      setMessage({ text: `Subscribed with permit! Tx: ${tx.hash}`, type: 'success' });
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
      <h1>{t('manage.title')}</h1>
      {subs.length > 0 && (
        <ul className="list" data-testid="subs-list">
          {subs.map((s) => (
            <li key={s.planId.toString()}>
              {`Plan ${s.planId.toString()} - next ${s.nextPaymentDate.toString()} - ${s.isActive ? t('manage.status_active') : t('manage.status_cancelled')}`}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
      {loading && <p>{t('manage.processing')}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      <div>
        <label htmlFor="plan-id">{t('manage.plan_id')} </label>
        <input
          id="plan-id"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="deadline">{t('manage.deadline')} </label>
        <input
          id="deadline"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="sig-v">{t('manage.v')} </label>
        <input id="sig-v" value={v} onChange={(e) => setV(e.target.value)} />
      </div>
      <div>
        <label htmlFor="sig-r">{t('manage.r')} </label>
        <input id="sig-r" value={r} onChange={(e) => setR(e.target.value)} />
      </div>
      <div>
        <label htmlFor="sig-s">{t('manage.s')} </label>
        <input id="sig-s" value={s} onChange={(e) => setS(e.target.value)} />
      </div>
      <button onClick={requestPermit} disabled={loading || !account}>{t('manage.get_permit')}</button>
      <button onClick={subscribePermit} disabled={loading}>{t('manage.subscribe_permit')}</button>
      <button onClick={subscribe} disabled={loading}>{t('manage.subscribe')}</button>
      <button onClick={cancel} disabled={loading}>{t('manage.cancel')}</button>
    </div>
  );
}
