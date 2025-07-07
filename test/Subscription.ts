import { ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { Subscription } from "../typechain";

const ONE_DAY_IN_SECS = 24 * 60 * 60;
const THIRTY_DAYS_IN_SECS = 30 * ONE_DAY_IN_SECS;

async function deploySubscriptionFixture() {
    const [owner, user1, merchant, anotherUser] = await ethers.getSigners();

    const MockTokenFactory = await ethers.getContractFactory("MockToken", owner);
    const mockToken = await MockTokenFactory.deploy("Mock Token", "MTK", 18);
    await mockToken.waitForDeployment();

    const initialUserBalance = ethers.parseUnits("1000", 18);
    await mockToken.mint(user1.address, initialUserBalance);
    await mockToken.mint(anotherUser.address, initialUserBalance);

    const SubscriptionFactory = await ethers.getContractFactory("Subscription", owner);
    const subscriptionContract = (await SubscriptionFactory.deploy()) as Subscription;
    await subscriptionContract.waitForDeployment();

    await mockToken.connect(user1).approve(subscriptionContract.target, ethers.parseUnits("5000", 18));
    await mockToken.connect(anotherUser).approve(subscriptionContract.target, ethers.parseUnits("5000", 18));

    const MockAggregatorFactory = await ethers.getContractFactory("MockV3Aggregator", owner);
    const initialOraclePrice = 2000n * 10n ** 8n;
    const mockAggregator = await MockAggregatorFactory.deploy(8, initialOraclePrice);
    await mockAggregator.waitForDeployment();

    return { subscriptionContract, mockToken, mockAggregator, owner, user1, merchant, anotherUser, initialUserBalance, initialOraclePrice };
}

describe("Subscription Contract", function () {

    describe("Deployment", function () {
        it("Should deploy contracts successfully and set the right owner/values", async function () {
            const { subscriptionContract, mockToken, mockAggregator, owner, user1, initialUserBalance, initialOraclePrice } = await loadFixture(deploySubscriptionFixture);
            expect(subscriptionContract.target).to.not.be.undefined;
            expect(await subscriptionContract.owner()).to.equal(owner.address);
            
            expect(mockToken.target).to.not.be.undefined;
            expect(await mockToken.balanceOf(user1.address)).to.equal(initialUserBalance);
            expect(await mockToken.decimals()).to.equal(18);


            expect(mockAggregator.target).to.not.be.undefined;
            expect(await mockAggregator.decimals()).to.equal(8);
            const [, latestPrice, , ,] = await mockAggregator.latestRoundData();
            expect(latestPrice).to.equal(initialOraclePrice);
        });
    });

    describe("createPlan", function () {
        const mockTokenDecimals = 18; // Defined here for use in tests

        it("Should allow owner to create a fixed price plan (merchant is owner) and emit PlanCreated event", async function () {
            const { subscriptionContract, mockToken, owner } = await loadFixture(deploySubscriptionFixture);
            const fixedPrice = ethers.parseUnits("10", mockTokenDecimals);
            const billingCycle = THIRTY_DAYS_IN_SECS;

            await expect(subscriptionContract.connect(owner).createPlan(
                owner.address, // merchantAddress
                mockToken.target,
                fixedPrice,
                billingCycle,
                false, // priceInUsd
                0,     // usdPrice
                ethers.ZeroAddress // priceFeedAddress
            ))
                .to.emit(subscriptionContract, "PlanCreated")
                .withArgs(0, owner.address, mockToken.target, mockTokenDecimals, fixedPrice, billingCycle, false, 0, ethers.ZeroAddress);

            const plan = await subscriptionContract.plans(0);
            expect(plan.merchant).to.equal(owner.address);
            expect(plan.token).to.equal(mockToken.target);
            expect(plan.tokenDecimals).to.equal(mockTokenDecimals);
            expect(plan.price).to.equal(fixedPrice);
            expect(plan.billingCycle).to.equal(billingCycle);
            expect(plan.priceInUsd).to.be.false;
            expect(plan.usdPrice).to.equal(0);
            expect(plan.priceFeedAddress).to.equal(ethers.ZeroAddress);
            expect(await subscriptionContract.nextPlanId()).to.equal(1);
        });

        it("Should allow owner to create a USD priced plan with a different merchant and emit PlanCreated event", async function () {
            const { subscriptionContract, mockToken, mockAggregator, owner, merchant } = await loadFixture(deploySubscriptionFixture);
            const usdPriceCents = 1000; // $10.00
            const billingCycle = THIRTY_DAYS_IN_SECS;

            await expect(subscriptionContract.connect(owner).createPlan(
                merchant.address, // merchantAddress
                mockToken.target,
                0, // fixedPrice (not used)
                billingCycle,
                true,  // priceInUsd
                usdPriceCents,
                mockAggregator.target
            ))
                .to.emit(subscriptionContract, "PlanCreated")
                .withArgs(0, merchant.address, mockToken.target, mockTokenDecimals, 0, billingCycle, true, usdPriceCents, mockAggregator.target);

            const plan = await subscriptionContract.plans(0);
            expect(plan.merchant).to.equal(merchant.address);
            expect(plan.tokenDecimals).to.equal(mockTokenDecimals);
            expect(plan.priceInUsd).to.be.true;
            expect(plan.usdPrice).to.equal(usdPriceCents);
            expect(plan.priceFeedAddress).to.equal(mockAggregator.target);
        });

        it("Should default merchant to owner if address(0) is provided for merchantAddress", async function () {
            const { subscriptionContract, mockToken, owner } = await loadFixture(deploySubscriptionFixture);
            const fixedPrice = ethers.parseUnits("5", mockTokenDecimals);
            await subscriptionContract.connect(owner).createPlan(
                ethers.ZeroAddress, // merchantAddress
                mockToken.target, fixedPrice, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress
            );
            const plan = await subscriptionContract.plans(0);
            expect(plan.merchant).to.equal(owner.address);
        });

        it("Should prevent non-owner from creating a plan", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(deploySubscriptionFixture);
            await expect(
                subscriptionContract.connect(user1).createPlan(
                    owner.address,
                    mockToken.target,
                    10,
                    THIRTY_DAYS_IN_SECS,
                    false,
                    0,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if creating a USD plan with zero address for price feed", async function () {
            const { subscriptionContract, mockToken, owner } = await loadFixture(deploySubscriptionFixture);
            await expect(subscriptionContract.connect(owner).createPlan(
                owner.address, mockToken.target, 0, THIRTY_DAYS_IN_SECS, true, 1000, ethers.ZeroAddress
            )).to.be.revertedWith("Price feed address required for USD pricing");
        });

        it("Should revert if creating a plan with zero address for token", async function () {
            const { subscriptionContract, owner } = await loadFixture(deploySubscriptionFixture);
            await expect(subscriptionContract.connect(owner).createPlan(
                owner.address, ethers.ZeroAddress, 100, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress
            )).to.be.revertedWith("Token address cannot be zero");
        });

        it("Should revert if billingCycle is zero", async function () {
            const { subscriptionContract, mockToken, owner } = await loadFixture(deploySubscriptionFixture);
            await expect(subscriptionContract.connect(owner).createPlan(
                owner.address,
                mockToken.target,
                1,
                0,
                false,
                0,
                ethers.constants.AddressZero
            )).to.be.revertedWith("Billing cycle must be > 0");
        });

        it("Should revert if USD plan has zero usdPrice", async function () {
            const { subscriptionContract, mockToken, owner, mockAggregator } = await loadFixture(deploySubscriptionFixture);
            await expect(
                subscriptionContract.connect(owner).createPlan(
                    owner.address,
                    mockToken.target,
                    0,
                    THIRTY_DAYS_IN_SECS,
                    true,
                    0,
                    mockAggregator.target
                )
            ).to.be.revertedWith("USD price must be > 0");
        });

        it("Should revert if token priced plan has zero price", async function () {
            const { subscriptionContract, mockToken, owner } = await loadFixture(deploySubscriptionFixture);
            await expect(
                subscriptionContract.connect(owner).createPlan(
                    owner.address,
                    mockToken.target,
                    0,
                    THIRTY_DAYS_IN_SECS,
                    false,
                    0,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("Token price must be > 0");
        });
    });

    describe("updatePlan", function () {
        async function fixtureWithExistingPlan() {
            const setup = await loadFixture(deploySubscriptionFixture);
            const fixedPrice = ethers.parseUnits("10", 18);
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address,
                setup.mockToken.target,
                fixedPrice,
                THIRTY_DAYS_IN_SECS,
                false,
                0,
                ethers.ZeroAddress
            );
            return { ...setup, fixedPrice };
        }

        it("Owner can update plan parameters and event emitted", async function () {
            const { subscriptionContract, owner, fixedPrice } = await loadFixture(fixtureWithExistingPlan);
            const newPrice = ethers.parseUnits("15", 18);
            const newBilling = THIRTY_DAYS_IN_SECS * 2;

            await expect(
                subscriptionContract.connect(owner).updatePlan(
                    0,
                    newBilling,
                    newPrice,
                    false,
                    0,
                    ethers.ZeroAddress
                )
            )
                .to.emit(subscriptionContract, "PlanUpdated")
                .withArgs(0, newBilling, newPrice, false, 0, ethers.ZeroAddress);

            const plan = await subscriptionContract.plans(0);
            expect(plan.price).to.equal(newPrice);
            expect(plan.billingCycle).to.equal(newBilling);
        });

        it("Updated price is used when subscribing", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(fixtureWithExistingPlan);
            const newPrice = ethers.parseUnits("20", 18);
            const newBilling = THIRTY_DAYS_IN_SECS / 2;
            await subscriptionContract.connect(owner).updatePlan(0, newBilling, newPrice, false, 0, ethers.ZeroAddress);

            const userBalBefore = await mockToken.balanceOf(user1.address);
            await subscriptionContract.connect(user1).subscribe(0);
            const userBalAfter = await mockToken.balanceOf(user1.address);
            expect(userBalBefore - userBalAfter).to.equal(newPrice);

            const sub = await subscriptionContract.userSubscriptions(user1.address, 0);
            expect(sub.nextPaymentDate).to.equal(sub.startTime + BigInt(newBilling));
        });

        it("Non-owner cannot update plan", async function () {
            const { subscriptionContract, user1 } = await loadFixture(fixtureWithExistingPlan);
            await expect(
                subscriptionContract.connect(user1).updatePlan(
                    0,
                    THIRTY_DAYS_IN_SECS,
                    0,
                    false,
                    0,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Reverts when enabling USD pricing without feed", async function () {
            const { subscriptionContract, owner } = await loadFixture(fixtureWithExistingPlan);
            await expect(
                subscriptionContract.connect(owner).updatePlan(0, THIRTY_DAYS_IN_SECS, 0, true, 1000, ethers.ZeroAddress)
            ).to.be.revertedWith("Price feed address required for USD pricing");
        });

        it("Reverts when billingCycle is zero", async function () {
            const { subscriptionContract, owner } = await loadFixture(fixtureWithExistingPlan);
            await expect(
                subscriptionContract.connect(owner).updatePlan(0, 0, 0, false, 0, ethers.constants.AddressZero)
            ).to.be.revertedWith("Billing cycle must be > 0");
        });

        it("Reverts when USD plan updated with zero usdPrice", async function () {
            const { subscriptionContract, owner, mockAggregator } = await loadFixture(fixtureWithExistingPlan);
            await expect(
                subscriptionContract.connect(owner).updatePlan(0, THIRTY_DAYS_IN_SECS, 0, true, 0, mockAggregator.target)
            ).to.be.revertedWith("USD price must be > 0");
        });

        it("Reverts when token plan updated with zero price", async function () {
            const { subscriptionContract, owner } = await loadFixture(fixtureWithExistingPlan);
            await expect(
                subscriptionContract.connect(owner).updatePlan(0, THIRTY_DAYS_IN_SECS, 0, false, 0, ethers.ZeroAddress)
            ).to.be.revertedWith("Token price must be > 0");
        });

        async function fixtureWithExistingUsdPlan() {
            const setup = await loadFixture(deploySubscriptionFixture);
            const usdPrice = 1000;
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address,
                setup.mockToken.target,
                0,
                THIRTY_DAYS_IN_SECS,
                true,
                usdPrice,
                setup.mockAggregator.target
            );
            return { ...setup, usdPrice };
        }

        it("Owner can switch from token price to USD price", async function () {
            const { subscriptionContract, owner, mockAggregator } = await loadFixture(fixtureWithExistingPlan);
            const newUsdPrice = 1500;
            await expect(
                subscriptionContract.connect(owner).updatePlan(0, THIRTY_DAYS_IN_SECS, 0, true, newUsdPrice, mockAggregator.target)
            )
                .to.emit(subscriptionContract, "PlanUpdated")
                .withArgs(0, THIRTY_DAYS_IN_SECS, 0, true, newUsdPrice, mockAggregator.target);

            const plan = await subscriptionContract.plans(0);
            expect(plan.priceInUsd).to.be.true;
            expect(plan.usdPrice).to.equal(newUsdPrice);
            expect(plan.priceFeedAddress).to.equal(mockAggregator.target);
        });

        it("Owner can switch from USD price to token price", async function () {
            const { subscriptionContract, owner } = await loadFixture(fixtureWithExistingUsdPlan);
            const newPrice = ethers.parseUnits("7", 18);
            const newBilling = THIRTY_DAYS_IN_SECS * 2;
            await expect(
                subscriptionContract.connect(owner).updatePlan(0, newBilling, newPrice, false, 0, ethers.ZeroAddress)
            )
                .to.emit(subscriptionContract, "PlanUpdated")
                .withArgs(0, newBilling, newPrice, false, 0, ethers.ZeroAddress);

            const plan = await subscriptionContract.plans(0);
            expect(plan.priceInUsd).to.be.false;
            expect(plan.price).to.equal(newPrice);
            expect(plan.priceFeedAddress).to.equal(ethers.ZeroAddress);
            expect(plan.usdPrice).to.equal(0);
        });
    });

    describe("updateMerchant", function () {
        async function fixtureWithActiveSubscription() {
            const setup = await loadFixture(deploySubscriptionFixture);
            const price = ethers.parseUnits("10", 18);
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address,
                setup.mockToken.target,
                price,
                THIRTY_DAYS_IN_SECS,
                false,
                0,
                ethers.ZeroAddress
            );
            await setup.subscriptionContract.connect(setup.user1).subscribe(0);
            return { ...setup, price };
        }

        it("Owner can change merchant and new merchant processes payment", async function () {
            const { subscriptionContract, mockToken, owner, merchant, user1, price } = await loadFixture(fixtureWithActiveSubscription);
            let sub = await subscriptionContract.userSubscriptions(user1.address, 0);
            await time.increaseTo(sub.nextPaymentDate + 1n);
            await expect(subscriptionContract.connect(owner).updateMerchant(0, merchant.address))
                .to.emit(subscriptionContract, "MerchantUpdated")
                .withArgs(0, owner.address, merchant.address);

            await expect(subscriptionContract.connect(owner).processPayment(user1.address, 0))
                .to.be.revertedWith("Only plan merchant can process payment");

            const balBefore = await mockToken.balanceOf(merchant.address);
            await expect(subscriptionContract.connect(merchant).processPayment(user1.address, 0))
                .to.emit(subscriptionContract, "PaymentProcessed");
            expect(await mockToken.balanceOf(merchant.address)).to.equal(balBefore + price);
        });

        it("Non-owner cannot update merchant", async function () {
            const { subscriptionContract, user1, merchant } = await loadFixture(fixtureWithActiveSubscription);
            await expect(subscriptionContract.connect(user1).updateMerchant(0, merchant.address))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("disablePlan", function () {
        async function fixtureWithPlan() {
            const setup = await loadFixture(deploySubscriptionFixture);
            const price = ethers.parseUnits("10", 18);
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address,
                setup.mockToken.target,
                price,
                THIRTY_DAYS_IN_SECS,
                false,
                0,
                ethers.ZeroAddress
            );
            return { ...setup, price };
        }

        it("Owner can disable plan", async function () {
            const { subscriptionContract, owner } = await loadFixture(fixtureWithPlan);
            await expect(subscriptionContract.connect(owner).disablePlan(0))
                .to.emit(subscriptionContract, "PlanDisabled").withArgs(0);
            const plan = await subscriptionContract.plans(0);
            expect(plan.active).to.be.false;
        });

        it("Disabled plan rejects new subscriptions and payments", async function () {
            const { subscriptionContract, owner, user1 } = await loadFixture(fixtureWithPlan);
            await subscriptionContract.connect(owner).disablePlan(0);
            await expect(subscriptionContract.connect(user1).subscribe(0)).to.be.revertedWith(
                "Plan is disabled"
            );
            await expect(subscriptionContract.connect(owner).processPayment(user1.address, 0)).to.be.revertedWith(
                "Plan is disabled"
            );
        });
    });

    describe("subscribe (Fixed Price Plan)", function () {
        const planId = 0;
        const fixedPrice = ethers.parseUnits("10", 18); // mockTokenDecimals is 18
        const billingCycle = THIRTY_DAYS_IN_SECS;

        async function fixtureWithFixedPlan() {
            const setup = await loadFixture(deploySubscriptionFixture);
            // Merchant for this plan will be 'owner'
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address, // Merchant is owner
                setup.mockToken.target, fixedPrice, billingCycle, false, 0, ethers.ZeroAddress
            );
            return setup;
        }

        async function fixtureWithActiveFixedSubscription() {
            const setup = await loadFixture(deploySubscriptionFixture);
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address,
                setup.mockToken.target,
                fixedPrice,
                billingCycle,
                false,
                0,
                ethers.ZeroAddress
            );
            await setup.subscriptionContract.connect(setup.user1).subscribe(planId);
            return setup;
        }

        it("Should allow user to subscribe to a fixed price plan", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(fixtureWithFixedPlan);
            const merchantAddress = owner.address;

            const user1BalanceBefore = await mockToken.balanceOf(user1.address);
            const merchantBalanceBefore = await mockToken.balanceOf(merchantAddress);

            await expect(subscriptionContract.connect(user1).subscribe(planId))
                .to.emit(subscriptionContract, "Subscribed")
                .withArgs(user1.address, planId, (val: any) => val.gt(0));

            const subscription = await subscriptionContract.userSubscriptions(user1.address, planId);
            expect(subscription.isActive).to.be.true;
            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore - fixedPrice);
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore + fixedPrice);
        });

        it("Should revert when subscribing to a non-existent plan", async function () {
            const { subscriptionContract, user1 } = await loadFixture(deploySubscriptionFixture);
            await expect(subscriptionContract.connect(user1).subscribe(999)).to.be.revertedWith("Plan does not exist");
        });

        it("Should revert if contract has insufficient allowance for subscription", async function () {
            const { subscriptionContract, mockToken, user1 } = await loadFixture(fixtureWithFixedPlan);
            await mockToken.connect(user1).approve(subscriptionContract.target, 0);
            await expect(subscriptionContract.connect(user1).subscribe(planId)).to.be.revertedWith("Insufficient allowance");
        });

        it("Should revert when already subscribed to the plan", async function () {
            const { subscriptionContract, user1 } = await loadFixture(fixtureWithActiveFixedSubscription);
            await expect(subscriptionContract.connect(user1).subscribe(planId)).to.be.revertedWith("Already actively subscribed to this plan");
        });

        // ... other fixed price subscribe tests
    });

    describe("subscribeWithPermit", function () {
        const planId = 0;
        const price = ethers.parseUnits("5", 18);
        const billingCycle = THIRTY_DAYS_IN_SECS;

        async function fixtureWithPermitPlan() {
            const [owner, user1] = await ethers.getSigners();
            const PermitFactory = await ethers.getContractFactory("PermitToken", owner);
            const permitToken = await PermitFactory.deploy("Permit Token", "PTK");
            await permitToken.waitForDeployment();

            const SubscriptionFactory = await ethers.getContractFactory("Subscription", owner);
            const subscription = (await SubscriptionFactory.deploy()) as Subscription;
            await subscription.waitForDeployment();

            const amount = ethers.parseUnits("1000", 18);
            await permitToken.mint(user1.address, amount);

            await subscription.connect(owner).createPlan(
                owner.address,
                permitToken.target,
                price,
                billingCycle,
                false,
                0,
                ethers.ZeroAddress
            );

            return { owner, user1, subscription, permitToken };
        }

        it("Subscribes using permit", async function () {
            const { owner, user1, subscription, permitToken } = await loadFixture(fixtureWithPermitPlan);

            const nonce = await permitToken.nonces(user1.address);
            const deadline = (await time.latest()) + 3600;

            const domain = {
                name: await permitToken.name(),
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: permitToken.target,
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
                owner: user1.address,
                spender: await subscription.getAddress(),
                value: price,
                nonce,
                deadline,
            };
            const signature = await user1.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(signature);

            const balBefore = await permitToken.balanceOf(user1.address);
            await expect(subscription.connect(user1).subscribeWithPermit(planId, deadline, v, r, s))
                .to.emit(subscription, "Subscribed");
            expect(await permitToken.balanceOf(user1.address)).to.equal(balBefore - price);
        });

        it("Reverts with expired permit signature", async function () {
            const { owner, user1, subscription, permitToken } = await loadFixture(fixtureWithPermitPlan);

            const nonce = await permitToken.nonces(user1.address);
            const deadline = (await time.latest()) + 100;

            const domain = {
                name: await permitToken.name(),
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: permitToken.target,
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
                owner: user1.address,
                spender: await subscription.getAddress(),
                value: price,
                nonce,
                deadline,
            };
            const sig = await user1.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(sig);

            await time.increaseTo(deadline + 1);

            await expect(
                subscription.connect(user1).subscribeWithPermit(planId, deadline, v, r, s)
            ).to.be.revertedWith("ERC20Permit: expired deadline");
        });

        it("Reverts with invalid permit signature", async function () {
            const { owner, user1, subscription, permitToken } = await loadFixture(fixtureWithPermitPlan);

            const nonce = await permitToken.nonces(user1.address);
            const deadline = (await time.latest()) + 3600;

            const domain = {
                name: await permitToken.name(),
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: permitToken.target,
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
            // Sign with wrong value to invalidate signature
            const values = {
                owner: user1.address,
                spender: await subscription.getAddress(),
                value: price + 1n,
                nonce,
                deadline,
            };
            const sig = await user1.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(sig);

            await expect(
                subscription.connect(user1).subscribeWithPermit(planId, deadline, v, r, s)
            ).to.be.revertedWith("ERC20Permit: invalid signature");
        });
    });

    describe("subscribe (USD Priced Plan)", function () {
        const planId = 0;
        const usdPriceCents = 1000; // $10.00
        const billingCycle = THIRTY_DAYS_IN_SECS;
        const mockTokenDecimals = 18;
        const oracleDecimals = 8;

        async function fixtureWithUsdPlan() {
            const setup = await loadFixture(deploySubscriptionFixture);
            // Oracle price: $2000 / MTK (initialOraclePrice from deploySubscriptionFixture)
            // Ensure mockAggregator has the initial price set correctly if not already by deploy fixture.
            // await setup.mockAggregator.setLatestAnswer(setup.initialOraclePrice); // Already set in deploy fixture

            // Merchant for this plan will be 'owner'
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address, // Merchant is owner
                setup.mockToken.target,
                0,
                billingCycle,
                true,
                usdPriceCents,
                setup.mockAggregator.target
            );
            return setup;
        }

        it("Should allow user to subscribe, calculating correct token amount based on oracle price", async function () {
            const { subscriptionContract, mockToken, user1, owner, mockAggregator, initialOraclePrice } = await loadFixture(fixtureWithUsdPlan);
            const planDetails = await subscriptionContract.plans(planId);
            const merchantAddress = planDetails.merchant; // Will be owner.address from fixture
            expect(merchantAddress).to.equal(owner.address);


            const user1BalanceBefore = await mockToken.balanceOf(user1.address);
            const merchantBalanceBefore = await mockToken.balanceOf(merchantAddress);

            // Expected amount calculation:
            // (usdPriceCents * (10**tokenDecimals) * (10**oracleDecimals)) / (100 * oraclePrice)
            // (1000 * 10^18 * 10^8) / (100 * 2000 * 10^8)
            // = (1000 * 10^18) / (100 * 2000) = 10^18 / 200 = 0.005 * 10^18
            const expectedTokenAmount = BigNumber.from(usdPriceCents)
                .mul(BigNumber.from("10").pow(mockTokenDecimals))
                .mul(BigNumber.from("10").pow(oracleDecimals))
                .div(
                    BigNumber.from(100)
                    .mul(await (await mockAggregator.latestRoundData()).answer)
                );
            
            expect(expectedTokenAmount).to.equal(ethers.parseUnits("0.005", 18));


            await expect(subscriptionContract.connect(user1).subscribe(planId))
                .to.emit(subscriptionContract, "Subscribed");

            const subscription = await subscriptionContract.userSubscriptions(user1.address, planId);
            expect(subscription.isActive).to.be.true;

            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore - expectedTokenAmount);
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore + expectedTokenAmount);
        });

        it("Should revert if oracle price is zero", async function () {
            const { subscriptionContract, user1, mockAggregator } = await loadFixture(fixtureWithUsdPlan);
            await mockAggregator.setLatestAnswer(0);
            await expect(subscriptionContract.connect(user1).subscribe(planId))
                .to.be.revertedWith("Oracle price must be positive");
        });
        it("Should revert if oracle price is negative", async function () {
            const { subscriptionContract, user1, mockAggregator } = await loadFixture(fixtureWithUsdPlan);
            await mockAggregator.setLatestAnswer(-1); // Negative price
            await expect(subscriptionContract.connect(user1).subscribe(planId))
                .to.be.revertedWith("Oracle price must be positive"); // Or other error if SafeCast fails first
        });

        it("Should revert if price feed data is stale", async function () {
            const { subscriptionContract, user1 } = await loadFixture(fixtureWithUsdPlan);
            await time.increase(3601); // advance time beyond allowed freshness
            await expect(subscriptionContract.connect(user1).subscribe(planId))
                .to.be.revertedWith("Price feed stale");
        });
    });

    describe("processPayment (Fixed Price Plan)", function () {
        const planId = 0;
        const fixedPrice = ethers.parseUnits("10", 18);
        const billingCycle = THIRTY_DAYS_IN_SECS;

        async function fixtureWithActiveFixedSubscription() {
            const setup = await loadFixture(deploySubscriptionFixture);
            // Plan merchant is owner
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address, // merchant
                setup.mockToken.target,
                fixedPrice,
                billingCycle,
                false, 0, ethers.ZeroAddress
            );
            await setup.subscriptionContract.connect(setup.user1).subscribe(planId);
            return setup;
        }

        it("Should process fixed price payment by merchant and emit PaymentProcessed with correct next payment date", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(fixtureWithActiveFixedSubscription);
            const planDetails = await subscriptionContract.plans(planId);
            const merchantAddress = planDetails.merchant;
            expect(merchantAddress).to.equal(owner.address); // Verify merchant is owner as set in fixture

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            const originalNextPaymentDate = subDetails.nextPaymentDate;
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            const user1BalanceBefore = await mockToken.balanceOf(user1.address);
            const merchantBalanceBefore = await mockToken.balanceOf(merchantAddress);

            // Process payment by owner (who is the merchant for this plan)
            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.emit(subscriptionContract, "PaymentProcessed")
                .withArgs(user1.address, planId, fixedPrice, originalNextPaymentDate + BigInt(billingCycle));

            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore - fixedPrice);
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore + fixedPrice);
            const newSubDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            expect(newSubDetails.nextPaymentDate).to.equal(originalNextPaymentDate + BigInt(billingCycle));
        });

        it("Should prevent non-merchant from processing fixed price payment", async function () {
            const { subscriptionContract, user1, anotherUser, merchant } = await loadFixture(fixtureWithActiveFixedSubscription);
            // In fixtureWithActiveFixedSubscription, 'owner' is the merchant.
            // 'merchant' signer is a different entity here.
            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            await expect(subscriptionContract.connect(anotherUser).processPayment(user1.address, planId))
                .to.be.revertedWith("Only plan merchant can process payment");
            await expect(subscriptionContract.connect(user1).processPayment(user1.address, planId))
                .to.be.revertedWith("Only plan merchant can process payment");
            // Test with the 'merchant' signer who is not the plan's merchant for this specific plan
            await expect(subscriptionContract.connect(merchant).processPayment(user1.address, planId))
                .to.be.revertedWith("Only plan merchant can process payment");
        });

        it("Should revert if user has insufficient balance for fixed price payment", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(fixtureWithActiveFixedSubscription);
            // Drain user1's balance
            const user1Balance = await mockToken.balanceOf(user1.address);
            await mockToken.connect(user1).transfer(owner.address, user1Balance); // Transfer all to owner

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.be.reverted; // ERC20: transfer amount exceeds balance (or SafeERC20ex: TransactionExecutionError)
        });

        it("Should revert if contract has insufficient allowance for fixed price payment", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(fixtureWithActiveFixedSubscription);
            // Revoke allowance
            await mockToken.connect(user1).approve(subscriptionContract.target, 0);

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.be.reverted; // ERC20: insufficient allowance (or SafeERC20ex: TransactionExecutionError)
        });

    });

    describe("processPayment (USD Priced Plan)", function () {
        const planId = 0;
        const usdPriceCents = 1000; // $10.00
        const billingCycle = THIRTY_DAYS_IN_SECS;
        // mockTokenDecimals and oracleDecimals are defined in the outer scope of subscribe tests
        // We can rely on plan.tokenDecimals and mockAggregator.decimals() fetched dynamically if needed

        async function fixtureWithActiveUsdSubscription() {
            const setup = await loadFixture(deploySubscriptionFixture);
            // Initial oracle price: $2000 / MTK is set in deploySubscriptionFixture by default
            // Plan merchant is owner
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.owner.address, // merchant
                setup.mockToken.target,
                0, // price
                billingCycle,
                true, // priceInUsd
                usdPriceCents,
                setup.mockAggregator.target
            );
            await setup.subscriptionContract.connect(setup.user1).subscribe(planId); // Initial payment based on $2000/MTK
            return setup;
        }

        it("Should process USD payment by merchant with updated oracle price, new token amount, and correct next payment date", async function () {
            const { subscriptionContract, mockToken, mockAggregator, user1, owner } = await loadFixture(fixtureWithActiveUsdSubscription);
            const planDetails = await subscriptionContract.plans(planId);
            const merchantAddress = planDetails.merchant;
            expect(merchantAddress).to.equal(owner.address); // Verify merchant
            const tokenDecimals = planDetails.tokenDecimals;
            const oracleDecimals = await mockAggregator.decimals();

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            const originalNextPaymentDate = subDetails.nextPaymentDate;
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            // Update oracle price: $2500 / MTK
            const newOraclePrice = BigNumber.from("2500").mul(BigNumber.from("10").pow(oracleDecimals));
            await mockAggregator.setLatestAnswer(newOraclePrice);

            const user1BalanceBefore = await mockToken.balanceOf(user1.address);
            const merchantBalanceBefore = await mockToken.balanceOf(merchantAddress);

            // Expected amount calculation with new price:
            // (usdPriceCents * (10**tokenDecimals) * (10**oracleFeedDecimals)) / (100 * oraclePriceInDollars * 10**oracleFeedDecimals)
            // = (usdPriceCents * 10**tokenDecimals) / (100 * oraclePriceInDollars)
            // Here, newOraclePrice is already price * 10**oracleDecimals
            // So, (usdPriceCents * 10**tokenDecimals * 10**oracleDecimals) / (100 * newOraclePrice)
            const expectedTokenAmount = BigNumber.from(usdPriceCents)
                .mul(BigNumber.from("10").pow(mockTokenDecimals))
                .mul(BigNumber.from("10").pow(oracleDecimals)) // for consistency with contract formula
                .div(
                    BigNumber.from(100) // To convert cents to dollars
                    .mul(newOraclePrice) // newOraclePrice is already price * 10^oracleDecimals
                );
            expect(expectedTokenAmount).to.equal(ethers.parseUnits("0.004", tokenDecimals)); // 0.004 MTK for $10 at $2500/MTK

            // Process payment by owner (who is the merchant for this plan)
            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.emit(subscriptionContract, "PaymentProcessed")
                .withArgs(user1.address, planId, expectedTokenAmount, originalNextPaymentDate + BigInt(billingCycle));
            
            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore - expectedTokenAmount);
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore + expectedTokenAmount);

            const newSubDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            expect(newSubDetails.nextPaymentDate).to.equal(originalNextPaymentDate + BigInt(billingCycle));
        });

        it("Should prevent non-merchant from processing USD priced payment", async function () {
            const { subscriptionContract, user1, anotherUser, merchant } = await loadFixture(fixtureWithActiveUsdSubscription);
            // In fixtureWithActiveUsdSubscription, 'owner' is the merchant.
            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            await expect(subscriptionContract.connect(anotherUser).processPayment(user1.address, planId))
                .to.be.revertedWith("Only plan merchant can process payment");
            await expect(subscriptionContract.connect(user1).processPayment(user1.address, planId))
                .to.be.revertedWith("Only plan merchant can process payment");
            await expect(subscriptionContract.connect(merchant).processPayment(user1.address, planId))
                .to.be.revertedWith("Only plan merchant can process payment");
        });

        it("Should revert processPayment by merchant if oracle price is zero", async function () {
            const { subscriptionContract, mockAggregator, user1, owner } = await loadFixture(fixtureWithActiveUsdSubscription);
            // 'owner' is the merchant for this plan
            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);
            await mockAggregator.setLatestAnswer(0);
            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.be.revertedWith("Oracle price must be positive");
        });

        it("Should revert processPayment if price feed is stale", async function () {
            const { subscriptionContract, user1, owner } = await loadFixture(fixtureWithActiveUsdSubscription);
            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);
            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.be.revertedWith("Price feed stale");
        });

        it("Should revert if user has insufficient balance for USD priced payment", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(fixtureWithActiveUsdSubscription);
            const user1Balance = await mockToken.balanceOf(user1.address);
            await mockToken.connect(user1).transfer(owner.address, user1Balance);

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.be.reverted;
        });

        it("Should revert if contract has insufficient allowance for USD priced payment", async function () {
            const { subscriptionContract, mockToken, user1, owner } = await loadFixture(fixtureWithActiveUsdSubscription);
            await mockToken.connect(user1).approve(subscriptionContract.target, 0);

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate + 1n);

            await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
                .to.be.reverted;
        });
    });
});


describe("cancelSubscription", function () {
    const planId = 0;
    const fixedPrice = ethers.parseUnits("10", 18);
    const billingCycle = THIRTY_DAYS_IN_SECS;

    async function fixtureWithActiveSubscriptionForCancel() {
        const setup = await loadFixture(deploySubscriptionFixture);
        // Plan merchant is owner
        await setup.subscriptionContract.connect(setup.owner).createPlan(
            setup.owner.address, // merchant
            setup.mockToken.target,
            fixedPrice,
            billingCycle,
            false, 0, ethers.ZeroAddress
        );
        // user1 subscribes
        await setup.subscriptionContract.connect(setup.user1).subscribe(planId);
        return setup;
    }

    it("Should allow a subscriber to cancel their active subscription", async function () {
        const { subscriptionContract, user1 } = await loadFixture(fixtureWithActiveSubscriptionForCancel);

        await expect(subscriptionContract.connect(user1).cancelSubscription(planId))
            .to.emit(subscriptionContract, "SubscriptionCancelled")
            .withArgs(user1.address, planId);

        const userSub = await subscriptionContract.userSubscriptions(user1.address, planId);
        expect(userSub.isActive).to.be.false;
    });

    it("Should prevent cancelling an already inactive subscription", async function () {
        const { subscriptionContract, user1 } = await loadFixture(fixtureWithActiveSubscriptionForCancel);
        // Cancel it once
        await subscriptionContract.connect(user1).cancelSubscription(planId);
        // Try to cancel again
        await expect(subscriptionContract.connect(user1).cancelSubscription(planId))
            .to.be.revertedWith("Subscription is already inactive");
    });

    it("Should prevent cancelling a subscription one is not subscribed to (or does not exist for user)", async function () {
        const { subscriptionContract, anotherUser } = await loadFixture(fixtureWithActiveSubscriptionForCancel);
        // anotherUser tries to cancel user1's subscription planId, but for their own account
        await expect(subscriptionContract.connect(anotherUser).cancelSubscription(planId))
            .to.be.revertedWith("Not subscribed to this plan or subscription data mismatch");
    });

    it("Should prevent cancelling a non-existent plan ID for the user", async function () {
        const { subscriptionContract, user1 } = await loadFixture(fixtureWithActiveSubscriptionForCancel);
        const nonExistentPlanId = 99;
        await expect(subscriptionContract.connect(user1).cancelSubscription(nonExistentPlanId))
             .to.be.revertedWith("Not subscribed to this plan or subscription data mismatch");
    });


    it("Should prevent processing payment for a cancelled subscription", async function () {
        const { subscriptionContract, user1, owner } = await loadFixture(fixtureWithActiveSubscriptionForCancel);

        // Cancel the subscription
        await subscriptionContract.connect(user1).cancelSubscription(planId);

        let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
        await time.increaseTo(subDetails.nextPaymentDate + 1n); // Advance time to when payment would be due

        // Owner (merchant) tries to process payment
        await expect(subscriptionContract.connect(owner).processPayment(user1.address, planId))
            .to.be.revertedWith("Subscription is not active");
    });
});

describe("Ownable2Step Behavior", function () {
    it("Should have correct initial owner", async function () {
        const { subscriptionContract, owner } = await loadFixture(deploySubscriptionFixture);
        expect(await subscriptionContract.owner()).to.equal(owner.address);
    });

    it("Should allow owner to transfer ownership in two steps", async function () {
        const { subscriptionContract, owner, anotherUser } = await loadFixture(deploySubscriptionFixture);

        // Owner starts ownership transfer to anotherUser
        await expect(subscriptionContract.connect(owner).transferOwnership(anotherUser.address))
            .to.emit(subscriptionContract, "OwnershipTransferStarted")
            .withArgs(owner.address, anotherUser.address);

        expect(await subscriptionContract.pendingOwner()).to.equal(anotherUser.address);
        expect(await subscriptionContract.owner()).to.equal(owner.address); // Owner remains the same

        // anotherUser (new owner) accepts ownership
        await expect(subscriptionContract.connect(anotherUser).acceptOwnership())
            .to.emit(subscriptionContract, "OwnershipTransferred")
            .withArgs(owner.address, anotherUser.address);

        expect(await subscriptionContract.owner()).to.equal(anotherUser.address);
        expect(await subscriptionContract.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("Should prevent non-owner from initiating ownership transfer", async function () {
        const { subscriptionContract, user1, anotherUser } = await loadFixture(deploySubscriptionFixture);
        await expect(subscriptionContract.connect(user1).transferOwnership(anotherUser.address))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-pending-owner from accepting ownership", async function () {
        const { subscriptionContract, owner, user1, anotherUser } = await loadFixture(deploySubscriptionFixture);
        await subscriptionContract.connect(owner).transferOwnership(anotherUser.address); // Owner initiates

        // User1 (not pending owner) tries to accept
        await expect(subscriptionContract.connect(user1).acceptOwnership())
            .to.be.revertedWith("Ownable2Step: caller is not the new owner");
    });

    it("Owner should still be able to call onlyOwner functions while ownership transfer is pending", async function () {
        const { subscriptionContract, mockToken, owner, anotherUser } = await loadFixture(deploySubscriptionFixture);
        await subscriptionContract.connect(owner).transferOwnership(anotherUser.address);

        // Owner can still create plans
        await expect(subscriptionContract.connect(owner).createPlan(
            owner.address, mockToken.target, 100, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress
        )).to.not.be.reverted;
    });

    it("onlyOwner functions should be callable by new owner after transfer", async function () {
        const { subscriptionContract, mockToken, owner, anotherUser } = await loadFixture(deploySubscriptionFixture);
        await subscriptionContract.connect(owner).transferOwnership(anotherUser.address);
        await subscriptionContract.connect(anotherUser).acceptOwnership();

        // New owner (anotherUser) can create plans
        await expect(subscriptionContract.connect(anotherUser).createPlan(
            anotherUser.address, mockToken.target, 100, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress
        )).to.not.be.reverted;

        // Old owner cannot
        await expect(subscriptionContract.connect(owner).createPlan(
            owner.address, mockToken.target, 100, THIRTY_DAYS_IN_SECS, false, 0, ethers.ZeroAddress
        )).to.be.revertedWith("Ownable: caller is not the owner");
    });
});

describe("Pausable", function () {
    async function fixtureWithPlanAndSubscription() {
        const setup = await loadFixture(deploySubscriptionFixture);
        const fixedPrice = ethers.parseUnits("10", 18);
        await setup.subscriptionContract.connect(setup.owner).createPlan(
            setup.owner.address,
            setup.mockToken.target,
            fixedPrice,
            THIRTY_DAYS_IN_SECS,
            false,
            0,
            ethers.ZeroAddress
        );
        await setup.subscriptionContract.connect(setup.user1).subscribe(0);
        return { ...setup, fixedPrice };
    }

    it("Only owner or pauser role can pause and unpause", async function () {
        const { subscriptionContract, owner, anotherUser } = await loadFixture(deploySubscriptionFixture);
        const pauserRole = await subscriptionContract.PAUSER_ROLE();

        await expect(subscriptionContract.connect(owner).pause()).to.not.be.reverted;
        await expect(subscriptionContract.connect(owner).unpause()).to.not.be.reverted;

        await expect(subscriptionContract.connect(anotherUser).pause()).to.be.revertedWith("Not pauser or owner");

        await subscriptionContract.connect(owner).grantRole(pauserRole, anotherUser.address);
        await expect(subscriptionContract.connect(anotherUser).pause()).to.not.be.reverted;
        await expect(subscriptionContract.connect(anotherUser).unpause()).to.not.be.reverted;
    });

    it("Paused contract rejects subscription and payment functions", async function () {
        const { subscriptionContract, owner, user1, fixedPrice } = await loadFixture(fixtureWithPlanAndSubscription);
        await subscriptionContract.connect(owner).pause();

        await expect(subscriptionContract.connect(owner).createPlan(
            owner.address,
            ethers.ZeroAddress,
            fixedPrice,
            THIRTY_DAYS_IN_SECS,
            false,
            0,
            ethers.ZeroAddress
        )).to.be.revertedWith("Pausable: paused");

        await expect(subscriptionContract.connect(user1).subscribe(0)).to.be.revertedWith("Pausable: paused");
        await expect(subscriptionContract.connect(owner).processPayment(user1.address, 0)).to.be.revertedWith("Pausable: paused");
        await expect(subscriptionContract.connect(user1).cancelSubscription(0)).to.be.revertedWith("Pausable: paused");
    });
});

describe("Reentrancy protection", function () {
    async function deployMaliciousFixture() {
        const [owner, user1] = await ethers.getSigners();

        const MaliciousTokenFactory = await ethers.getContractFactory("MaliciousToken", owner);
        const maliciousToken = await MaliciousTokenFactory.deploy("Malicious Token", "MAL", 18);
        await maliciousToken.waitForDeployment();

        const SubscriptionFactory = await ethers.getContractFactory("Subscription", owner);
        const subscriptionContract = (await SubscriptionFactory.deploy()) as Subscription;
        await subscriptionContract.waitForDeployment();

        const amount = ethers.parseUnits("100", 18);
        await maliciousToken.mint(user1.address, amount);

        await maliciousToken.connect(user1).approve(subscriptionContract.target, amount);

        const fixedPrice = ethers.parseUnits("10", 18);
        await subscriptionContract.connect(owner).createPlan(
            owner.address,
            maliciousToken.target,
            fixedPrice,
            THIRTY_DAYS_IN_SECS,
            false,
            0,
            ethers.ZeroAddress
        );

        // Configure token to attempt reentrancy during subscribe
        const data = subscriptionContract.interface.encodeFunctionData("cancelSubscription", [0]);
        await maliciousToken.setReentrancy(subscriptionContract.target, data);

        return { subscriptionContract, maliciousToken, owner, user1 };
    }

    it("subscribe rejects reentrant token", async function () {
        const { subscriptionContract, user1 } = await loadFixture(deployMaliciousFixture);
        await expect(subscriptionContract.connect(user1).subscribe(0))
            .to.be.revertedWithCustomError(subscriptionContract, "ReentrancyGuardReentrantCall");
    });

    it("processPayment rejects reentrancy", async function () {
        const { subscriptionContract, maliciousToken, owner, user1 } = await loadFixture(deployMaliciousFixture);
        // Disable reentrancy for initial subscribe
        await maliciousToken.setReentrancy(ethers.ZeroAddress, "0x");
        await subscriptionContract.connect(user1).subscribe(0);

        // Now attempt reentrancy during processPayment
        const data = subscriptionContract.interface.encodeFunctionData("subscribe", [0]);
        await maliciousToken.setReentrancy(subscriptionContract.target, data);

        await time.increase(THIRTY_DAYS_IN_SECS + 1);
        await expect(subscriptionContract.connect(owner).processPayment(user1.address, 0))
            .to.be.revertedWithCustomError(subscriptionContract, "ReentrancyGuardReentrantCall");
    });
});

describe("recoverERC20", function () {
    it("Only owner can recover tokens", async function () {
        const { subscriptionContract, mockToken, owner, user1 } = await loadFixture(deploySubscriptionFixture);

        const amount = ethers.parseUnits("50", 18);
        await mockToken.connect(owner).transfer(subscriptionContract.target, amount);

        await expect(
            subscriptionContract.connect(user1).recoverERC20(mockToken.target, amount)
        ).to.be.revertedWith("Ownable: caller is not the owner");

        const ownerBalBefore = await mockToken.balanceOf(owner.address);

        await expect(subscriptionContract.connect(owner).recoverERC20(mockToken.target, amount)).to.not.be.reverted;

        expect(await mockToken.balanceOf(owner.address)).to.equal(ownerBalBefore + amount);
    });
});

describe("getPaymentAmount with uncommon decimals", function () {
    async function fixtureDecimals6() {
        const [owner, user1] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("MockToken", owner);
        const tokenDecimals = 6;
        const token = await Token.deploy("Mock6", "M6", tokenDecimals);
        await token.waitForDeployment();
        const amount = ethers.parseUnits("1000", tokenDecimals);
        await token.mint(user1.address, amount);

        const Sub = await ethers.getContractFactory("Subscription", owner);
        const subscription = (await Sub.deploy()) as Subscription;
        await subscription.waitForDeployment();
        await token.connect(user1).approve(subscription.target, ethers.parseUnits("5000", tokenDecimals));

        const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
        const oracleDecimals = 10;
        const price = 2000n * 10n ** BigInt(oracleDecimals);
        const feed = await Agg.deploy(oracleDecimals, price);
        await feed.waitForDeployment();

        return { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price };
    }

    it("handles 6 decimal tokens", async function () {
        const { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price } = await loadFixture(fixtureDecimals6);
        const usdPrice = 1234;
        await subscription.connect(owner).createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        const expected = BigNumber.from(usdPrice)
            .mul(BigNumber.from(10).pow(tokenDecimals))
            .mul(BigNumber.from(10).pow(oracleDecimals))
            .div(BigNumber.from(100).mul(price));
        const before = BigNumber.from(await token.balanceOf(user1.address));
        await subscription.connect(user1).subscribe(0);
        const after = BigNumber.from(await token.balanceOf(user1.address));
        expect(before.sub(after)).to.equal(expected);
    });

    async function fixtureDecimals30() {
        const [owner, user1] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("MockToken", owner);
        const tokenDecimals = 30;
        const token = await Token.deploy("Mock30", "M30", tokenDecimals);
        await token.waitForDeployment();
        const amount = ethers.parseUnits("1000", tokenDecimals);
        await token.mint(user1.address, amount);

        const Sub = await ethers.getContractFactory("Subscription", owner);
        const subscription = (await Sub.deploy()) as Subscription;
        await subscription.waitForDeployment();
        await token.connect(user1).approve(subscription.target, ethers.parseUnits("5000", tokenDecimals));

        const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
        const oracleDecimals = 12;
        const price = 3000n * 10n ** BigInt(oracleDecimals);
        const feed = await Agg.deploy(oracleDecimals, price);
        await feed.waitForDeployment();

        return { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price };
    }

    it("handles 30 decimal tokens", async function () {
        const { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price } = await loadFixture(fixtureDecimals30);
        const usdPrice = 1000;
        await subscription.connect(owner).createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        const expected = BigNumber.from(usdPrice)
            .mul(BigNumber.from(10).pow(tokenDecimals))
            .mul(BigNumber.from(10).pow(oracleDecimals))
            .div(BigNumber.from(100).mul(price));
        const before = BigNumber.from(await token.balanceOf(user1.address));
        await subscription.connect(user1).subscribe(0);
        const after = BigNumber.from(await token.balanceOf(user1.address));
        expect(before.sub(after)).to.equal(expected);
    });

    async function fixtureDecimals6Subscribed() {
        const base = await fixtureDecimals6();
        const usdPrice = 1234;
        await base.subscription
            .connect(base.owner)
            .createPlan(base.owner.address, base.token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, base.feed.target);
        await base.subscription.connect(base.user1).subscribe(0);
        await time.increase(THIRTY_DAYS_IN_SECS + 1);
        return { ...base, usdPrice };
    }

    it("processPayment handles 6 decimal tokens", async function () {
        const { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price, usdPrice } = await loadFixture(
            fixtureDecimals6Subscribed
        );
        const expected = BigNumber.from(usdPrice)
            .mul(BigNumber.from(10).pow(tokenDecimals))
            .mul(BigNumber.from(10).pow(oracleDecimals))
            .div(BigNumber.from(100).mul(price));
        const before = BigNumber.from(await token.balanceOf(user1.address));
        await subscription.connect(owner).processPayment(user1.address, 0);
        const after = BigNumber.from(await token.balanceOf(user1.address));
        expect(before.sub(after)).to.equal(expected);
    });

    async function fixtureDecimals30Subscribed() {
        const base = await fixtureDecimals30();
        const usdPrice = 1000;
        await base.subscription
            .connect(base.owner)
            .createPlan(base.owner.address, base.token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, base.feed.target);
        await base.subscription.connect(base.user1).subscribe(0);
        await time.increase(THIRTY_DAYS_IN_SECS + 1);
        return { ...base, usdPrice };
    }

    it("processPayment handles 30 decimal tokens", async function () {
        const { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price, usdPrice } = await loadFixture(
            fixtureDecimals30Subscribed
        );
        const expected = BigNumber.from(usdPrice)
            .mul(BigNumber.from(10).pow(tokenDecimals))
            .mul(BigNumber.from(10).pow(oracleDecimals))
            .div(BigNumber.from(100).mul(price));
        const before = BigNumber.from(await token.balanceOf(user1.address));
        await subscription.connect(owner).processPayment(user1.address, 0);
        const after = BigNumber.from(await token.balanceOf(user1.address));
        expect(before.sub(after)).to.equal(expected);
    });

    async function fixtureOverflow() {
        const [owner, user1] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("MockToken", owner);
        const tokenDecimals = 76;
        const token = await Token.deploy("MockBig", "MBIG", tokenDecimals);
        await token.waitForDeployment();
        const amount = ethers.parseUnits("1", tokenDecimals);
        await token.mint(user1.address, amount);

        const Sub = await ethers.getContractFactory("Subscription", owner);
        const subscription = (await Sub.deploy()) as Subscription;
        await subscription.waitForDeployment();
        await token.connect(user1).approve(subscription.target, amount);

        const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
        const oracleDecimals = 20;
        const price = 2000n * 10n ** BigInt(oracleDecimals);
        const feed = await Agg.deploy(oracleDecimals, price);
        await feed.waitForDeployment();

        return { owner, user1, subscription, token, feed };
    }

    it("reverts on overflow", async function () {
        const { owner, user1, subscription, token, feed } = await loadFixture(fixtureOverflow);
        const usdPrice = 1000;
        await subscription.connect(owner).createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        await expect(subscription.connect(user1).subscribe(0)).to.be.reverted;
    });

    async function fixtureMaxDecimals() {
        const [owner, user1] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("MockToken", owner);
        const tokenDecimals = 38;
        const token = await Token.deploy("Mock38", "M38", tokenDecimals);
        await token.waitForDeployment();
        const amount = ethers.parseUnits("1000", tokenDecimals);
        await token.mint(user1.address, amount);

        const Sub = await ethers.getContractFactory("Subscription", owner);
        const subscription = (await Sub.deploy()) as Subscription;
        await subscription.waitForDeployment();
        await token.connect(user1).approve(subscription.target, ethers.parseUnits("5000", tokenDecimals));

        const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
        const oracleDecimals = 38;
        const price = 2000n * 10n ** BigInt(oracleDecimals);
        const feed = await Agg.deploy(oracleDecimals, price);
        await feed.waitForDeployment();

        return { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price };
    }

    it("handles max decimals with small price", async function () {
        const { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price } = await loadFixture(fixtureMaxDecimals);
        const usdPrice = 1;
        await subscription.connect(owner).createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        const expected = BigNumber.from(usdPrice)
            .mul(BigNumber.from(10).pow(tokenDecimals + oracleDecimals))
            .div(BigNumber.from(100).mul(price));
        const before = await token.balanceOf(user1.address);
        await subscription.connect(user1).subscribe(0);
        const after = await token.balanceOf(user1.address);
        expect(before.sub(after)).to.equal(expected);
    });

    it("reverts when exponent and price overflow", async function () {
        const { owner, user1, subscription, token, feed } = await loadFixture(fixtureMaxDecimals);
        const usdPrice = 100; // digits=3 so 38+38+3 > 77
        await subscription.connect(owner).createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        await expect(subscription.connect(user1).subscribe(0)).to.be.revertedWith("price overflow");
    });
});

// New high decimals boundary tests

describe("High decimal boundary", function () {
    async function fixtureHighDecimals() {
        const [owner, user1] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("MockToken", owner);
        const tokenDecimals = 30;
        const token = await Token.deploy("High30", "H30", tokenDecimals);
        await token.waitForDeployment();
        const amount = ethers.parseUnits("1000", tokenDecimals);
        await token.mint(user1.address, amount);

        const Sub = await ethers.getContractFactory("Subscription", owner);
        const subscription = (await Sub.deploy()) as Subscription;
        await subscription.waitForDeployment();
        await token.connect(user1).approve(subscription.target, ethers.parseUnits("5000", tokenDecimals));

        const Agg = await ethers.getContractFactory("MockV3Aggregator", owner);
        const oracleDecimals = 30;
        const price = 2000n * 10n ** BigInt(oracleDecimals);
        const feed = await Agg.deploy(oracleDecimals, price);
        await feed.waitForDeployment();

        return { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price };
    }

    it("subscribes at exponent limit", async function () {
        const { owner, user1, token, subscription, feed, tokenDecimals, oracleDecimals, price } = await loadFixture(fixtureHighDecimals);
        const usdPrice = ethers.toBigInt("10000000000000000");
        await subscription.connect(owner).createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        const expected = BigNumber.from(usdPrice)
            .mul(BigNumber.from(10).pow(tokenDecimals + oracleDecimals))
            .div(BigNumber.from(100).mul(price));
        const before = await token.balanceOf(user1.address);
        await subscription.connect(user1).subscribe(0);
        const after = await token.balanceOf(user1.address);
        expect(before.sub(after)).to.equal(expected);
    });

    it("reverts when boundary exceeded", async function () {
        const { owner, user1, subscription, token, feed } = await loadFixture(fixtureHighDecimals);
        const usdPrice = ethers.toBigInt("100000000000000000");
        await subscription.connect(owner).createPlan(owner.address, token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, feed.target);
        await expect(subscription.connect(user1).subscribe(0)).to.be.revertedWith("price overflow");
    });

    async function fixtureHighDecimalsSubscribed() {
        const base = await fixtureHighDecimals();
        const usdPrice = ethers.toBigInt("10000000000000000");
        await base.subscription.connect(base.owner).createPlan(base.owner.address, base.token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, base.feed.target);
        await base.subscription.connect(base.user1).subscribe(0);
        await time.increase(THIRTY_DAYS_IN_SECS + 1);
        return { ...base, usdPrice };
    }

    it("processPayment at exponent limit", async function () {
        const { owner, user1, token, subscription, price, tokenDecimals, oracleDecimals, usdPrice } = await loadFixture(fixtureHighDecimalsSubscribed);
        const expected = BigNumber.from(usdPrice)
            .mul(BigNumber.from(10).pow(tokenDecimals + oracleDecimals))
            .div(BigNumber.from(100).mul(price));
        const before = await token.balanceOf(user1.address);
        await subscription.connect(owner).processPayment(user1.address, 0);
        const after = await token.balanceOf(user1.address);
        expect(before.sub(after)).to.equal(expected);
    });

    async function fixtureHighDecimalsSubscribedOverflow() {
        const base = await fixtureHighDecimals();
        const usdPrice = ethers.toBigInt("100000000000000000");
        await base.subscription.connect(base.owner).createPlan(base.owner.address, base.token.target, 0, THIRTY_DAYS_IN_SECS, true, usdPrice, base.feed.target);
        await base.subscription.connect(base.user1).subscribe(0);
        await time.increase(THIRTY_DAYS_IN_SECS + 1);
        return base;
    }

    it("processPayment reverts when boundary exceeded", async function () {
        const { owner, user1, subscription } = await loadFixture(fixtureHighDecimalsSubscribedOverflow);
        await expect(subscription.connect(owner).processPayment(user1.address, 0)).to.be.revertedWith("price overflow");
    });
});

