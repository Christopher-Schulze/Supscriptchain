import { ethers, upgrades } from "hardhat";
import { expect } from "chai";

describe("SubscriptionUpgradeable", function () {
  it("deploys and upgrades", async function () {
    const [owner] = await ethers.getSigners();
    const Sub = await ethers.getContractFactory("SubscriptionUpgradeable");
    const proxy = await upgrades.deployProxy(Sub, [owner.address], { kind: "transparent" });
    const addr = await proxy.getAddress();

    const SubV2 = await ethers.getContractFactory("SubscriptionUpgradeable");
    const upgraded = await upgrades.upgradeProxy(addr, SubV2);
    expect(await upgraded.owner()).to.equal(owner.address);
  });
});
