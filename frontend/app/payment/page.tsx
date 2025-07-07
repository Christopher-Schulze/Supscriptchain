'use client';
import { useState } from 'react';
import * as Form from '@radix-ui/react-form';
import { processPayment as contractProcessPayment } from '../../lib/contract';
import useWallet from '../../lib/useWallet';
import { useStore } from '../../lib/store';
import { useTranslation } from 'react-i18next';
import InputField from '../../lib/InputField';

export default function Payment() {
  const { account, connect } = useWallet();
  const [planId, setPlanId] = useState('0');
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setMessage } = useStore();
  const { t } = useTranslation();

  async function trigger() {
    setLoading(true);
    setError(null);
    try {
      if (!/^0x[0-9a-fA-F]{40}$/.test(user)) throw new Error('invalid user');
      if (!/^[0-9]+$/.test(planId) || Number(planId) < 0)
        throw new Error('invalid plan id');
      const tx = await contractProcessPayment(user, BigInt(planId));
      await tx.wait();
      setMessage({ text: t('messages.payment_processed', { hash: tx.hash }), type: 'success' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>{t('payment.title')}</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p>{t('manage.processing')}</p>}
      {!account && <button onClick={connect}>{t('generic.connect_wallet')}</button>}
      <Form.Root className="form" onSubmit={(e) => { e.preventDefault(); trigger(); }}>
        <InputField name="pay-user" label={t('payment.user')} value={user} onChange={setUser} />
        <InputField name="pay-plan" label={t('payment.plan_id')} value={planId} onChange={setPlanId} />
        <Form.Submit disabled={loading}>{t('payment.process')}</Form.Submit>
      </Form.Root>
    </div>
  );
}
