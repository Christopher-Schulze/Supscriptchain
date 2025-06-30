import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type {
  SubscriptionUpgradeable,
  SubscriptionUpgradeableV2,
} from "../typechain";

const PLAN_ID = 0;

async function deployUpgradeableFixture() {
  const [owner, user] = await ethers.getSigners();

  const TokenFactory = await ethers.getContractFactory("MockToken", owner);
  const token = await TokenFactory.deploy("MockToken", "MTK", 18);
  await token.waitForDeployment();
  await token.mint(user.address, ethers.parseUnits("1000", 18));

  const SubV1 = await ethers.getContractFactory("SubscriptionUpgradeable", owner);
  const proxy = (await upgrades.deployProxy(
    SubV1,
    [owner.address],
    { initializer: "initialize" }
  )) as SubscriptionUpgradeable;
  await proxy.waitForDeployment();

  await token.connect(user).approve(await proxy.getAddress(), ethers.parseUnits("1000", 18));

  return { owner, user, token, proxy };
}

describe("SubscriptionUpgradeable upgrade", function () {
  it("should upgrade and preserve state", async function () {
    const { owner, user, token, proxy } = await loadFixture(deployUpgradeableFixture);

    const price = ethers.parseUnits("10", 18);
    const cycle = 30 * 24 * 60 * 60;

    await proxy.connect(owner).createPlan(owner.address, token.address, price, cycle, false, 0, ethers.ZeroAddress);

    await proxy.connect(user).subscribe(PLAN_ID);
    const subBefore = await proxy.userSubscriptions(user.address, PLAN_ID);
    const planBefore = await proxy.plans(PLAN_ID);

    await time.increase(cycle + 1);

    const SubV2 = await ethers.getContractFactory("SubscriptionUpgradeableV2", owner);
    const upgraded = (await upgrades.upgradeProxy(
      await proxy.getAddress(),
      SubV2
    )) as SubscriptionUpgradeableV2;
    await upgraded.waitForDeployment();

    expect(await upgraded.version()).to.equal("v2");

    const subAfterUpgrade = await upgraded.userSubscriptions(user.address, PLAN_ID);
    expect(subAfterUpgrade.nextPaymentDate).to.equal(subBefore.nextPaymentDate);
    const planAfter = await upgraded.plans(PLAN_ID);
    expect(planAfter.merchant).to.equal(planBefore.merchant);

    const balBefore = await token.balanceOf(user.address);
    await upgraded.connect(owner).processPayment(user.address, PLAN_ID);
    const balAfter = await token.balanceOf(user.address);
    expect(balBefore - balAfter).to.equal(price);
    const subAfterPay = await upgraded.userSubscriptions(user.address, PLAN_ID);
    expect(subAfterPay.nextPaymentDate).to.equal(subBefore.nextPaymentDate + cycle);

    await upgraded.connect(user).cancelSubscription(PLAN_ID);
    const cancelled = await upgraded.userSubscriptions(user.address, PLAN_ID);
    expect(cancelled.isActive).to.be.false;
  });
});

