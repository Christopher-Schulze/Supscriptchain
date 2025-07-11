import { ethers } from 'ethers';
import type { ExternalProvider } from 'ethers';
import type { Subscription } from 'typechain/contracts/Subscription';
import { Subscription__factory } from 'typechain/factories/contracts/Subscription__factory';
import { env } from './env';
import i18n from './i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseEthersError(err: unknown): string {
  const e = err as any;
  const rpc = e?.error ?? e;
  if (rpc && typeof rpc === 'object' && 'message' in rpc) {
    let msg = (rpc as any).message as string;
    if (typeof (rpc as any).code !== 'undefined') {
      msg += ` (code ${(rpc as any).code})`;
    }
    if ((rpc as any).data) {
      const d = (rpc as any).data;
      msg += `: ${typeof d === 'string' ? d : JSON.stringify(d)}`;
    }
    return i18n.t('messages.transaction_failed', { error: msg });
  }
  return (
    i18n.t('messages.transaction_failed', {
      error:
        e?.shortMessage ||
        e?.reason ||
        e?.error?.message ||
        e?.data?.message ||
        (err instanceof Error ? err.message : String(err)),
    })
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function handleEthersError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new Error(parseEthersError(err));
  }
}

declare global {
  interface Window {
    ethereum?: ExternalProvider;
  }
}

export async function getContract(): Promise<Subscription> {
  const address = env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  let signerOrProvider: ethers.Signer | ethers.Provider;
  if (typeof window !== 'undefined' && (window as Window).ethereum) {
    const provider = new ethers.BrowserProvider((window as Window).ethereum!);
    const signer = await provider.getSigner();
    signerOrProvider = signer;
  } else {
    const rpc = env.NEXT_PUBLIC_RPC_URL;
    signerOrProvider = new ethers.JsonRpcProvider(rpc);
  }
  return Subscription__factory.connect(address, signerOrProvider);
}

export async function subscribeWithPermit(
  planId: bigint,
  deadline: bigint,
  v: number,
  r: string,
  s: string,
) {
  const contract = await getContract();
  return handleEthersError(() =>
    contract.subscribeWithPermit(planId, deadline, v, r, s),
  );
}

export async function createPlan(
  merchant: string,
  token: string,
  price: bigint,
  billing: bigint,
  priceInUsd: boolean,
  usdPrice: bigint,
  feed: string,
) {
  const contract = await getContract();
  return handleEthersError(() =>
    contract.createPlan(
      merchant,
      token,
      price,
      billing,
      priceInUsd,
      usdPrice,
      feed,
    ),
  );
}

export async function updatePlan(
  planId: bigint,
  billing: bigint,
  price: bigint,
  priceInUsd: boolean,
  usdPrice: bigint,
  feed: string,
) {
  const contract = await getContract();
  return handleEthersError(() =>
    contract.updatePlan(planId, billing, price, priceInUsd, usdPrice, feed),
  );
}

export async function updateMerchant(planId: bigint, merchant: string) {
  const contract = await getContract();
  return handleEthersError(() => contract.updateMerchant(planId, merchant));
}

export async function disablePlan(planId: bigint) {
  const contract = await getContract();
  return handleEthersError(() => contract.disablePlan(planId));
}

export async function subscribe(planId: bigint) {
  const contract = await getContract();
  return handleEthersError(() => contract.subscribe(planId));
}

export async function cancelSubscription(planId: bigint) {
  const contract = await getContract();
  return handleEthersError(() => contract.cancelSubscription(planId));
}

export async function processPayment(user: string, planId: bigint) {
  const contract = await getContract();
  return handleEthersError(() => contract.processPayment(user, planId));
}
