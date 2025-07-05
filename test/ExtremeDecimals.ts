import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { Subscription } from "../typechain";

const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;

async function extremeDecimalsFixture() {
    const [owner, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockToken", owner);
    const token = await Token.deploy("Extreme", "EXT", 38);
    await token.waitForDeployment();
    await token.mint(user.address, ethers.parseUnits("1000", 38));

    const Sub = await ethers.getContractFactory("Subscription", owner);
    const subscription = (await Sub.deploy()) as Subscription;
    await subscription.waitForDeployment();

    await token.connect(user).approve(subscription.target, ethers.parseUnits("5000", 38));

    const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
    const oracleDecimals = 38;
    const price = ethers.BigNumber.from(2000).mul(ethers.BigNumber.from(10).pow(oracleDecimals));
    const feed = await Agg.deploy(oracleDecimals, price);
    await feed.waitForDeployment();

    return { owner, user, token, subscription, feed };
}

async function tokenDecimalsTooLargeFixture() {
    const [owner, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockToken", owner);
    const token = await Token.deploy("TooBig", "TBG", 39);
    await token.waitForDeployment();
    await token.mint(user.address, ethers.parseUnits("1000", 39));

    const Sub = await ethers.getContractFactory("Subscription", owner);
    const subscription = (await Sub.deploy()) as Subscription;
    await subscription.waitForDeployment();

    await token.connect(user).approve(subscription.target, ethers.parseUnits("1000", 39));

    const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
    const feed = await Agg.deploy(8, 2000n * 10n ** 8n);
    await feed.waitForDeployment();

    return { owner, user, token, subscription, feed };
}

async function feedDecimalsTooLargeFixture() {
    const [owner, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockToken", owner);
    const token = await Token.deploy("Normal", "NRM", 18);
    await token.waitForDeployment();
    await token.mint(user.address, ethers.parseUnits("1000", 18));

    const Sub = await ethers.getContractFactory("Subscription", owner);
    const subscription = (await Sub.deploy()) as Subscription;
    await subscription.waitForDeployment();

    await token.connect(user).approve(subscription.target, ethers.parseUnits("1000", 18));

    const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
    const oracleDecimals = 39;
    const price = ethers.BigNumber.from(2000).mul(ethers.BigNumber.from(10).pow(oracleDecimals));
    const feed = await Agg.deploy(oracleDecimals, price);
    await feed.waitForDeployment();

    return { owner, user, token, subscription, feed };
}

async function extremeDecimalsSubscribedFixture() {
    const base = await extremeDecimalsFixture();
    const usdPrice = 1;
    await base.subscription
        .connect(base.owner)
        .createPlan(base.owner.address, base.token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, base.feed.target);
    await base.subscription.connect(base.user).subscribe(0);
    return { ...base, usdPrice };
}

describe("Extreme decimals scenarios", function () {
    it("subscribes at max exponent boundary", async function () {
        const { owner, user, token, subscription, feed } = await loadFixture(extremeDecimalsFixture);
        const usdPrice = 1;
        await subscription
            .connect(owner)
            .createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        const before = await token.balanceOf(user.address);
        await subscription.connect(user).subscribe(0);
        const after = await token.balanceOf(user.address);
        expect(before.sub(after)).to.be.gt(0);
    });

    it("reverts when exponent exceeds limit", async function () {
        const { owner, user, token, subscription, feed } = await loadFixture(extremeDecimalsFixture);
        const usdPrice = 12; // two digits -> overflow
        await subscription
            .connect(owner)
            .createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        await expect(subscription.connect(user).subscribe(0)).to.be.revertedWith("price overflow");
    });

    it("reverts when token decimals > 38", async function () {
        const { owner, user, token, subscription, feed } = await loadFixture(tokenDecimalsTooLargeFixture);
        const usdPrice = 1000;
        await subscription
            .connect(owner)
            .createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        await expect(subscription.connect(user).subscribe(0)).to.be.revertedWith("decimals too large");
    });

    it("reverts when price feed decimals > 38", async function () {
        const { owner, user, token, subscription, feed } = await loadFixture(feedDecimalsTooLargeFixture);
        const usdPrice = 1000;
        await subscription
            .connect(owner)
            .createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        await expect(subscription.connect(user).subscribe(0)).to.be.revertedWith("decimals too large");
    });

    it("reverts with stale price under extreme decimals", async function () {
        const { owner, user, subscription, feed, token } = await loadFixture(extremeDecimalsFixture);
        const usdPrice = 1;
        await subscription
            .connect(owner)
            .createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        await time.increase(3601);
        await expect(subscription.connect(user).subscribe(0)).to.be.revertedWith("Price feed stale");
    });

    it("processPayment reverts when price feed stale with extreme decimals", async function () {
        const { owner, user, subscription } = await loadFixture(extremeDecimalsSubscribedFixture);
        const sub = await subscription.userSubscriptions(user.address, 0);
        await time.increaseTo(sub.nextPaymentDate.add(1));
        await expect(subscription.connect(owner).processPayment(user.address, 0)).to.be.revertedWith(
            "Price feed stale"
        );
    });
});


