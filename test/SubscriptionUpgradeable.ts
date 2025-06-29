import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deployProxyFixture() {
  const [deployer] = await ethers.getSigners();
  const Sub = await ethers.getContractFactory("SubscriptionUpgradeable");
  const sub = await upgrades.deployProxy(Sub, [deployer.address]);
  await sub.deployed();

  const MockToken = await ethers.getContractFactory("MockToken");
  const token = await MockToken.deploy("Mock", "MOCK", 18);
  return { sub, deployer, token };
}

describe("SubscriptionUpgradeable upgrade", function () {
  it("preserves state across upgrade", async function () {
    const { sub, deployer, token } = await loadFixture(deployProxyFixture);

    await sub.createPlan(
      deployer.address,
      token.address,
      1,
      1,
      false,
      0,
      ethers.constants.AddressZero
    );

    const planBefore = await sub.plans(0);
    expect(planBefore.merchant).to.equal(deployer.address);

    const V2 = await ethers.getContractFactory("SubscriptionUpgradeableV2");
    const subV2 = await upgrades.upgradeProxy(sub.address, V2);

    expect(await subV2.version()).to.equal("v2");
    const planAfter = await subV2.plans(0);
    expect(planAfter.merchant).to.equal(deployer.address);

    await subV2.setUpgradeValue(42);
    expect(await subV2.upgradeValue()).to.equal(42);
  });
});
