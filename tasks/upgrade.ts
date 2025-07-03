import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export default task("upgrade", "Upgrade Subscription proxy to V2").setAction(
  async (_: unknown, hre: HardhatRuntimeEnvironment) => {
    const proxy = process.env.SUBSCRIPTION_ADDRESS;
    if (!proxy) {
      throw new Error("SUBSCRIPTION_ADDRESS not set");
    }

    console.log("Upgrading proxy at:", proxy);

    const SubV2 = await hre.ethers.getContractFactory("SubscriptionUpgradeableV2");
    const upgraded = await hre.upgrades.upgradeProxy(proxy, SubV2);
    await upgraded.waitForDeployment();

    const impl = await hre.upgrades.erc1967.getImplementationAddress(proxy);
    console.log("Upgraded implementation at:", impl);
  }
);
