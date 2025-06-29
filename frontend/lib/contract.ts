import { ethers } from "ethers";
import abi from "./subscriptionAbi";

export function getContract() {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not defined");
  let signerOrProvider: ethers.Signer | ethers.Provider;
  if (typeof window !== "undefined" && (window as any).ethereum) {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    signerOrProvider = provider.getSigner();
  } else {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpc) throw new Error("RPC provider not available");
    signerOrProvider = new ethers.JsonRpcProvider(rpc);
  }
  return new ethers.Contract(address, abi, signerOrProvider);
}
