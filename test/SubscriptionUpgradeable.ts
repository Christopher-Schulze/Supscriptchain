import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type {
  SubscriptionUpgradeable,
  SubscriptionUpgradeableV2,
} from "../typechain";

const PLAN_ID = 0;
const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;

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

    await proxy.connect(owner).createPlan(owner.address, token.target, price, cycle, false, 0, ethers.ZeroAddress);

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

describe("SubscriptionUpgradeable additional scenarios", function () {
  async function permitPlanFixture() {
    const [owner, user] = await ethers.getSigners();
    const PermitFactory = await ethers.getContractFactory("PermitToken", owner);
    const token = await PermitFactory.deploy("Permit Token", "PTK");
    await token.waitForDeployment();

    const Sub = await ethers.getContractFactory("SubscriptionUpgradeable", owner);
    const proxy = await upgrades.deployProxy(Sub, [owner.address], { initializer: "initialize" });
    await proxy.waitForDeployment();

    const price = ethers.parseUnits("5", 18);
    const cycle = 30 * 24 * 60 * 60;
    await token.mint(user.address, ethers.parseUnits("1000", 18));

    await proxy.connect(owner).createPlan(owner.address, token.target, price, cycle, false, 0, ethers.ZeroAddress);

    return { owner, user, proxy, token, price };
  }

  async function tokenPlanFixture() {
    const base = await deployUpgradeableFixture();
    const price = ethers.parseUnits("10", 18);
    const cycle = 30 * 24 * 60 * 60;
    await base.proxy.connect(base.owner).createPlan(base.owner.address, base.token.target, price, cycle, false, 0, ethers.ZeroAddress);

    const Agg = await ethers.getContractFactory("MockV3Aggregator", base.owner);
    const oraclePrice = ethers.toBigInt(2000) * 10n ** 8n;
    const aggregator = await Agg.deploy(8, oraclePrice);
    await aggregator.waitForDeployment();

    return { ...base, price, cycle, aggregator };
  }

  async function usdPlanFixture() {
    const base = await deployUpgradeableFixture();
    const cycle = 30 * 24 * 60 * 60;
    const Agg = await ethers.getContractFactory("MockV3Aggregator", base.owner);
    const oraclePrice = ethers.toBigInt(2000) * 10n ** 8n;
    const aggregator = await Agg.deploy(8, oraclePrice);
    await aggregator.waitForDeployment();

    const usdPrice = 1000;
    await base.proxy.connect(base.owner).createPlan(base.owner.address, base.token.target, 0, cycle, true, usdPrice, await aggregator.getAddress());

    return { ...base, cycle, aggregator, usdPrice };
  }

  describe("createPlan", function () {
    it("reverts when billingCycle is zero", async function () {
      const { owner, token, proxy } = await loadFixture(deployUpgradeableFixture);
      await expect(
        proxy.connect(owner).createPlan(owner.address, token.address, 1, 0, false, 0, ethers.ZeroAddress)
      ).to.be.revertedWith("Billing cycle must be > 0");
    });
  });

  describe("subscribeWithPermit", function () {
    it("reverts with expired permit signature", async function () {
      const { owner, user, proxy, token, price } = await loadFixture(permitPlanFixture);

      const nonce = await token.nonces(user.address);
      const deadline = (await time.latest()) + 100;

      const domain = {
        name: await token.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const values = {
        owner: user.address,
        spender: await proxy.getAddress(),
        value: price,
        nonce,
        deadline,
      };
      const sig = await user.signTypedData(domain, types, values);
      const { v, r, s } = ethers.Signature.from(sig);

      await time.increaseTo(deadline + 1);

      await expect(proxy.connect(user).subscribeWithPermit(PLAN_ID, deadline, v, r, s)).to.be.revertedWith(
        "ERC20Permit: expired deadline"
      );
    });

    it("reverts with invalid permit signature", async function () {
      const { owner, user, proxy, token, price } = await loadFixture(permitPlanFixture);

      const nonce = await token.nonces(user.address);
      const deadline = (await time.latest()) + 3600;

      const domain = {
        name: await token.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const values = {
        owner: user.address,
        spender: await proxy.getAddress(),
        value: price + 1n,
        nonce,
        deadline,
      };
      const sig = await user.signTypedData(domain, types, values);
      const { v, r, s } = ethers.Signature.from(sig);

      await expect(proxy.connect(user).subscribeWithPermit(PLAN_ID, deadline, v, r, s)).to.be.revertedWith(
        "ERC20Permit: invalid signature"
      );
    });
  });

  describe("updatePlan", function () {
    it("updates from token to USD pricing", async function () {
      const { proxy, owner, aggregator, cycle } = await loadFixture(tokenPlanFixture);
      const newUsd = 1500;
      await expect(
        proxy.connect(owner).updatePlan(PLAN_ID, cycle, 0, true, newUsd, await aggregator.getAddress())
      )
        .to.emit(proxy, "PlanUpdated")
        .withArgs(PLAN_ID, cycle, 0, true, newUsd, await aggregator.getAddress());

      const plan = await proxy.plans(PLAN_ID);
      expect(plan.priceInUsd).to.be.true;
      expect(plan.usdPrice).to.equal(newUsd);
      expect(plan.priceFeedAddress).to.equal(await aggregator.getAddress());
    });

    it("updates from USD pricing to token price", async function () {
      const { proxy, owner, usdPrice, cycle } = await loadFixture(usdPlanFixture);
      const newPrice = ethers.parseUnits("8", 18);
      const newCycle = cycle * 2;
      await expect(
        proxy.connect(owner).updatePlan(PLAN_ID, newCycle, newPrice, false, 0, ethers.ZeroAddress)
      )
        .to.emit(proxy, "PlanUpdated")
        .withArgs(PLAN_ID, newCycle, newPrice, false, 0, ethers.ZeroAddress);

      const plan = await proxy.plans(PLAN_ID);
      expect(plan.priceInUsd).to.be.false;
      expect(plan.price).to.equal(newPrice);
      expect(plan.priceFeedAddress).to.equal(ethers.ZeroAddress);
      expect(plan.usdPrice).to.equal(0);
    });

    it("reverts when billingCycle is zero", async function () {
      const { proxy, owner } = await loadFixture(tokenPlanFixture);
      await expect(
        proxy.connect(owner).updatePlan(PLAN_ID, 0, 0, false, 0, ethers.ZeroAddress)
      ).to.be.revertedWith("Billing cycle must be > 0");
    });
  });

  describe("updateMerchant", function () {
    async function activePlanFixture() {
      const [owner, user, merchant] = await ethers.getSigners();

      const TokenFactory = await ethers.getContractFactory("MockToken", owner);
      const token = await TokenFactory.deploy("MockToken", "MTK", 18);
      await token.waitForDeployment();
      await token.mint(user.address, ethers.parseUnits("1000", 18));

      const SubFactory = await ethers.getContractFactory("SubscriptionUpgradeable", owner);
      const proxy = (await upgrades.deployProxy(SubFactory, [owner.address], { initializer: "initialize" })) as SubscriptionUpgradeable;
      await proxy.waitForDeployment();

      await token.connect(user).approve(await proxy.getAddress(), ethers.parseUnits("1000", 18));

      const price = ethers.parseUnits("10", 18);
      await proxy.connect(owner).createPlan(owner.address, await token.getAddress(), price, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress);
      await proxy.connect(user).subscribe(PLAN_ID);
      return { owner, user, merchant, proxy, token, price };
    }

    it("owner changes merchant and new merchant processes payment", async function () {
      const { owner, user, merchant, proxy, token, price } = await loadFixture(activePlanFixture);
      const sub = await proxy.userSubscriptions(user.address, PLAN_ID);
      await time.increaseTo(sub.nextPaymentDate + 1n);
      await expect(proxy.connect(owner).updateMerchant(PLAN_ID, merchant.address))
        .to.emit(proxy, "MerchantUpdated")
        .withArgs(PLAN_ID, owner.address, merchant.address);

      await expect(proxy.connect(owner).processPayment(user.address, PLAN_ID)).to.be.revertedWith(
        "Only plan merchant can process payment"
      );

      const balBefore = await token.balanceOf(merchant.address);
      await expect(proxy.connect(merchant).processPayment(user.address, PLAN_ID)).to.emit(proxy, "PaymentProcessed");
      expect(await token.balanceOf(merchant.address)).to.equal(balBefore + price);
    });

    it("non-owner cannot update merchant", async function () {
      const { user, merchant, proxy } = await loadFixture(activePlanFixture);
      await expect(proxy.connect(user).updateMerchant(PLAN_ID, merchant.address))
        .to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });
  });

  describe("disablePlan", function () {
    async function planFixture() {
      const { owner, user, token, proxy } = await loadFixture(deployUpgradeableFixture);
      const price = ethers.parseUnits("10", 18);
      await proxy.connect(owner).createPlan(owner.address, token.target, price, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress);
      return { owner, user, proxy };
    }

    it("owner can disable plan", async function () {
      const { owner, proxy } = await loadFixture(planFixture);
      await expect(proxy.connect(owner).disablePlan(PLAN_ID))
        .to.emit(proxy, "PlanDisabled")
        .withArgs(PLAN_ID);
      const plan = await proxy.plans(PLAN_ID);
      expect(plan.active).to.be.false;
    });

    it("disabled plan rejects new subscriptions and payments", async function () {
      const { owner, user, proxy } = await loadFixture(planFixture);
      await proxy.connect(owner).disablePlan(PLAN_ID);
      await expect(proxy.connect(user).subscribe(PLAN_ID)).to.be.revertedWith("Plan is disabled");
      await expect(proxy.connect(owner).processPayment(user.address, PLAN_ID)).to.be.revertedWith(
        "Plan is disabled"
      );
    });
  });
});

describe("Reentrancy protection", function () {
  async function deployMaliciousFixture() {
    const [owner, user] = await ethers.getSigners();

    const MaliciousFactory = await ethers.getContractFactory("MaliciousToken", owner);
    const maliciousToken = await MaliciousFactory.deploy("Malicious Token", "MAL", 18);
    await maliciousToken.waitForDeployment();

    const SubFactory = await ethers.getContractFactory("SubscriptionUpgradeable", owner);
    const proxy = (await upgrades.deployProxy(SubFactory, [owner.address], { initializer: "initialize" })) as SubscriptionUpgradeable;
    await proxy.waitForDeployment();

    const amount = ethers.parseUnits("100", 18);
    await maliciousToken.mint(user.address, amount);
    await maliciousToken.connect(user).approve(await proxy.getAddress(), amount);

    const fixedPrice = ethers.parseUnits("10", 18);
    await proxy.connect(owner).createPlan(owner.address, await maliciousToken.getAddress(), fixedPrice, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress);

    const data = proxy.interface.encodeFunctionData("cancelSubscription", [PLAN_ID]);
    await maliciousToken.setReentrancy(await proxy.getAddress(), data);

    return { proxy, maliciousToken, owner, user };
  }

  it("subscribe rejects reentrant token", async function () {
    const { proxy, user } = await loadFixture(deployMaliciousFixture);
    await expect(proxy.connect(user).subscribe(PLAN_ID)).to.be.revertedWithCustomError(proxy, "ReentrancyGuardReentrantCall");
  });

  it("processPayment rejects reentrancy", async function () {
    const { proxy, maliciousToken, owner, user } = await loadFixture(deployMaliciousFixture);
    await maliciousToken.setReentrancy(ethers.ZeroAddress, "0x");
    await proxy.connect(user).subscribe(PLAN_ID);

    const data = proxy.interface.encodeFunctionData("subscribe", [PLAN_ID]);
    await maliciousToken.setReentrancy(await proxy.getAddress(), data);

    await time.increase(THIRTY_DAYS_IN_SECS + 1);
    await expect(proxy.connect(owner).processPayment(user.address, PLAN_ID)).to.be.revertedWithCustomError(proxy, "ReentrancyGuardReentrantCall");
  });
});

describe("recoverERC20", function () {
  it("Only owner can recover tokens", async function () {
    const { owner, user, token, proxy } = await loadFixture(deployUpgradeableFixture);

    const amount = ethers.parseUnits("50", 18);
    await token.connect(owner).transfer(await proxy.getAddress(), amount);

    await expect(
      proxy.connect(user).recoverERC20(await token.getAddress(), amount)
    )
      .to.be.revertedWith("Ownable: caller is not the owner");

    const balBefore = await token.balanceOf(owner.address);

    await expect(proxy.connect(owner).recoverERC20(await token.getAddress(), amount)).to.not.be.reverted;

    expect(await token.balanceOf(owner.address)).to.equal(balBefore + amount);
  });
});


describe("High decimal boundary", function () {
  async function highDecimalFixture() {
    const [owner, user] = await ethers.getSigners();
    const TokenFactory = await ethers.getContractFactory("MockToken", owner);
    const tokenDecimals = 30;
    const token = await TokenFactory.deploy("High30", "H30", tokenDecimals);
    await token.waitForDeployment();
    await token.mint(user.address, ethers.parseUnits("1000", tokenDecimals));

    const SubFactory = await ethers.getContractFactory("SubscriptionUpgradeable", owner);
    const proxy = (await upgrades.deployProxy(SubFactory, [owner.address], { initializer: "initialize" })) as SubscriptionUpgradeable;
    await proxy.waitForDeployment();

    await token.connect(user).approve(await proxy.getAddress(), ethers.parseUnits("5000", tokenDecimals));

    const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
    const oracleDecimals = 30;
    const oraclePrice = ethers.toBigInt(2000) * 10n ** 30n;
    const aggregator = await Agg.deploy(oracleDecimals, oraclePrice);
    await aggregator.waitForDeployment();

    return { owner, user, token, proxy, aggregator, tokenDecimals, oracleDecimals, oraclePrice };
  }

  it("subscribe at exponent limit", async function () {
    const { owner, user, token, proxy, aggregator, tokenDecimals, oracleDecimals, oraclePrice } = await loadFixture(highDecimalFixture);
    const usdPrice = 10n ** 16n;
    await proxy.connect(owner).createPlan(owner.address, await token.getAddress(), 0, THIRTY_DAYS_IN_SECS, true, usdPrice, await aggregator.getAddress());
    const expected = BigNumber.from(usdPrice)
      .mul(BigNumber.from(10).pow(tokenDecimals + oracleDecimals))
      .div(BigNumber.from(100).mul(oraclePrice));
    const before = BigNumber.from(await token.balanceOf(user.address));
    await proxy.connect(user).subscribe(PLAN_ID);
    const after = BigNumber.from(await token.balanceOf(user.address));
    expect(before.sub(after)).to.equal(expected);
  });

  it("subscribe reverts when boundary exceeded", async function () {
    const { owner, user, token, proxy, aggregator } = await loadFixture(highDecimalFixture);
    const usdPrice = 10n ** 17n;
    await proxy.connect(owner).createPlan(owner.address, await token.getAddress(), 0, THIRTY_DAYS_IN_SECS, true, usdPrice, await aggregator.getAddress());
    await expect(proxy.connect(user).subscribe(PLAN_ID)).to.be.revertedWith("price overflow");
  });

  async function highDecimalSubscribedFixture() {
    const base = await highDecimalFixture();
    const usdPrice = 10n ** 16n;
    await base.proxy.connect(base.owner).createPlan(base.owner.address, await base.token.getAddress(), 0, THIRTY_DAYS_IN_SECS, true, usdPrice, await base.aggregator.getAddress());
    await base.proxy.connect(base.user).subscribe(PLAN_ID);
    await time.increase(THIRTY_DAYS_IN_SECS + 1);
    return { ...base, usdPrice };
  }

  it("processPayment at exponent limit", async function () {
    const { owner, user, token, proxy, oraclePrice, tokenDecimals, oracleDecimals, usdPrice } = await loadFixture(highDecimalSubscribedFixture);
    const expected = BigNumber.from(usdPrice)
      .mul(BigNumber.from(10).pow(tokenDecimals + oracleDecimals))
      .div(BigNumber.from(100).mul(oraclePrice));
    const before = BigNumber.from(await token.balanceOf(user.address));
    await proxy.connect(owner).processPayment(user.address, PLAN_ID);
    const after = BigNumber.from(await token.balanceOf(user.address));
    expect(before.sub(after)).to.equal(expected);
  });

  async function highDecimalSubscribedOverflowFixture() {
    const base = await highDecimalFixture();
    const usdPrice = 10n ** 17n;
    await base.proxy.connect(base.owner).createPlan(base.owner.address, await base.token.getAddress(), 0, THIRTY_DAYS_IN_SECS, true, usdPrice, await base.aggregator.getAddress());
    await base.proxy.connect(base.user).subscribe(PLAN_ID);
    await time.increase(THIRTY_DAYS_IN_SECS + 1);
    return base;
  }

  it("processPayment reverts when boundary exceeded", async function () {
    const { owner, user, proxy } = await loadFixture(highDecimalSubscribedOverflowFixture);
    await expect(proxy.connect(owner).processPayment(user.address, PLAN_ID)).to.be.revertedWith("price overflow");
  });
});

