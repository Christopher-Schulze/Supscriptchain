import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("SubscriptionUpgradeable upgrade", function () {
  it("should upgrade and preserve state", async function () {
    const [owner] = await ethers.getSigners();

    const SubV1 = await ethers.getContractFactory("SubscriptionUpgradeable");
    const proxy = await upgrades.deployProxy(SubV1, [owner.address], { initializer: "initialize" });

    await proxy.waitForDeployment();

    const SubV2 = await ethers.getContractFactory("SubscriptionUpgradeableV2");
    const upgraded = await upgrades.upgradeProxy(await proxy.getAddress(), SubV2);

    expect(await upgraded.version()).to.equal("v2");
  });
});

