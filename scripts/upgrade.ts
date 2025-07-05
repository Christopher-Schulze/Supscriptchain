import { ethers, upgrades } from "hardhat";
import { loadEnv } from "./env";

export async function upgrade() {
  const env = loadEnv();
  const proxy = env.SUBSCRIPTION_ADDRESS;
  if (!proxy) {
    throw new Error("SUBSCRIPTION_ADDRESS not set");
  }

  const SubV2 = await ethers.getContractFactory("SubscriptionUpgradeableV2");
  const upgraded = await upgrades.upgradeProxy(proxy, SubV2);
  await upgraded.waitForDeployment();

  const impl = await upgrades.erc1967.getImplementationAddress(proxy);
  console.log("Upgraded implementation at:", impl);
}

if (require.main === module) {
  upgrade().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
