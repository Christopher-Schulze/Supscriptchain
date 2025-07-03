import { ethers } from "ethers";
import type { ExternalProvider } from "ethers";
import type { Subscription } from "typechain/contracts/Subscription.sol/Subscription";
import { Subscription__factory } from "typechain/factories/contracts/Subscription.sol/Subscription__factory";
import { requireEnv } from "./env";

declare global {
  interface Window {
    ethereum?: ExternalProvider;
  }
}

export async function getContract(): Promise<Subscription> {
  const address = requireEnv("NEXT_PUBLIC_CONTRACT_ADDRESS");
  let signerOrProvider: ethers.Signer | ethers.Provider;
  if (typeof window !== "undefined" && (window as Window).ethereum) {
    const provider = new ethers.BrowserProvider((window as Window).ethereum!);
    const signer = await provider.getSigner();
    signerOrProvider = signer;
  } else {
    const rpc = requireEnv("NEXT_PUBLIC_RPC_URL");
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
