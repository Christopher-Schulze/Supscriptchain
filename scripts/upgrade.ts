import { ethers, upgrades } from "hardhat";

async function main() {
  const proxy = process.env.PROXY_ADDRESS;
  if (!proxy) throw new Error("PROXY_ADDRESS env var required");

  const Sub = await ethers.getContractFactory("SubscriptionUpgradeable");
  const upgraded = await upgrades.upgradeProxy(proxy, Sub);
  await upgraded.waitForDeployment();
  console.log("Proxy upgraded at:", await upgraded.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
