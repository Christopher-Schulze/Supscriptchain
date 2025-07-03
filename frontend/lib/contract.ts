import { ethers } from "ethers";
import type { ExternalProvider } from "ethers";
import type { Subscription } from "typechain/contracts/Subscription.sol/Subscription";
import { Subscription__factory } from "typechain/factories/contracts/Subscription.sol/Subscription__factory";
import { env } from "./env";

declare global {
  interface Window {
    ethereum?: ExternalProvider;
  }
}

export async function getContract(): Promise<Subscription> {
  const address = env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  let signerOrProvider: ethers.Signer | ethers.Provider;
  if (typeof window !== "undefined" && (window as Window).ethereum) {
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
  s: string
) {
  const contract = await getContract();
  return contract.subscribeWithPermit(planId, deadline, v, r, s);
}

export async function createPlan(
  merchant: string,
  token: string,
  price: bigint,
  billing: bigint,
  priceInUsd: boolean,
  usdPrice: bigint,
  feed: string
) {
  const contract = await getContract();
  return contract.createPlan(merchant, token, price, billing, priceInUsd, usdPrice, feed);
}

export async function updatePlan(
  planId: bigint,
  billing: bigint,
  price: bigint,
  priceInUsd: boolean,
  usdPrice: bigint,
  feed: string
) {
  const contract = await getContract();
  return contract.updatePlan(planId, billing, price, priceInUsd, usdPrice, feed);
}
