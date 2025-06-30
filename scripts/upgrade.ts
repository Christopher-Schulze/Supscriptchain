import { ethers, upgrades } from "hardhat";

async function main() {
  const proxy = process.env.SUBSCRIPTION_ADDRESS;
  if (!proxy) {
    throw new Error("SUBSCRIPTION_ADDRESS not set");
  }

  const SubV2 = await ethers.getContractFactory("SubscriptionUpgradeableV2");
  const upgraded = await upgrades.upgradeProxy(proxy, SubV2);
  await upgraded.waitForDeployment();

  const impl = await upgrades.erc1967.getImplementationAddress(proxy);
  console.log("Upgraded implementation at:", impl);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
