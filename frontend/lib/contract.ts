import { ethers } from "ethers";
import type { Subscription } from "typechain/contracts/Subscription.sol/Subscription";
import { Subscription__factory } from "typechain/factories/contracts/Subscription.sol/Subscription__factory";

export async function getContract(): Promise<Subscription> {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not defined");
  let signerOrProvider: ethers.Signer | ethers.Provider;
  if (typeof window !== "undefined" && (window as any).ethereum) {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    signerOrProvider = signer;
  } else {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpc) throw new Error("RPC provider not available");
    signerOrProvider = new ethers.JsonRpcProvider(rpc);
  }
  return Subscription__factory.connect(address, signerOrProvider);
}
