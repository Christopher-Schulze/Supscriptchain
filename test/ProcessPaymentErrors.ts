import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { Subscription } from "../typechain";

const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;

async function fixtureWithActiveSubscription() {
    const [owner, user1] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockToken", owner);
    const token = await Token.deploy("Token", "TKN", 18);
    await token.waitForDeployment();
    await token.mint(user1.address, ethers.parseUnits("1000", 18));

    const Sub = await ethers.getContractFactory("Subscription", owner);
    const sub = (await Sub.deploy()) as Subscription;
    await sub.waitForDeployment();

    await token.connect(user1).approve(sub.target, ethers.parseUnits("1000", 18));

    await sub.connect(owner).createPlan(
        owner.address,
        token.target,
        ethers.parseUnits("10", 18),
        THIRTY_DAYS_IN_SECS,
        false,
        0,
        ethers.ZeroAddress
    );

    await sub.connect(user1).subscribe(0);

    return { owner, user1, token, sub };
}

describe("processPayment error scenarios", function () {
    it("reverts when payment not due yet", async function () {
        const { owner, user1, sub } = await loadFixture(fixtureWithActiveSubscription);
        await expect(sub.connect(owner).processPayment(user1.address, 0)).to.be.revertedWith(
            "Payment not due yet"
        );
    });

    it("reverts when plan does not exist", async function () {
        const { owner, user1, sub } = await loadFixture(fixtureWithActiveSubscription);
        await time.increase(THIRTY_DAYS_IN_SECS + 1);
        await expect(sub.connect(owner).processPayment(user1.address, 999)).to.be.revertedWith(
            "Plan does not exist"
        );
    });

    it("reverts when allowance is insufficient", async function () {
        const { owner, user1, token, sub } = await loadFixture(fixtureWithActiveSubscription);
        await token.connect(user1).approve(sub.target, 0);
        await time.increase(THIRTY_DAYS_IN_SECS + 1);
        await expect(sub.connect(owner).processPayment(user1.address, 0)).to.be.revertedWith(
            "Insufficient allowance"
        );
    });
});
