import { ethers, BigNumber } from "hardhat"; // BigNumber may be needed for calculations
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ONE_DAY_IN_SECS = 24 * 60 * 60;
const THIRTY_DAYS_IN_SECS = 30 * ONE_DAY_IN_SECS;

describe("Subscription Contract", function () {
    async function deploySubscriptionFixture() {
        const [owner, user1, merchant, anotherUser] = await ethers.getSigners();

        // Deploy MockToken
        const MockTokenFactory = await ethers.getContractFactory("MockToken", owner); // Deploy with owner
        const mockToken = await MockTokenFactory.deploy("Mock Token", "MTK", 18);
        // No need to call mockToken.deployed() with ethers v6, await on deploy() is enough

        // Mint some tokens to user1 and anotherUser for testing
        const initialUserBalance = ethers.utils.parseUnits("1000", 18);
        await mockToken.mint(user1.address, initialUserBalance);
        await mockToken.mint(anotherUser.address, initialUserBalance);

        // Deploy Subscription contract
        const SubscriptionFactory = await ethers.getContractFactory("Subscription", owner); // Deploy with owner
        const subscriptionContract = await SubscriptionFactory.deploy();
        
        // User1 approves the subscription contract to spend their mock tokens
        // Approve a large amount for simplicity in tests
        await mockToken.connect(user1).approve(subscriptionContract.address, ethers.utils.parseUnits("5000", 18));
        await mockToken.connect(anotherUser).approve(subscriptionContract.address, ethers.utils.parseUnits("5000", 18));

        // Deploy MockV3Aggregator
        const MockAggregatorFactory = await ethers.getContractFactory("MockV3Aggregator", owner);
        // 8 decimals for price feed (common for USD pairs), initial price $2000 / token
        const initialOraclePrice = ethers.BigNumber.from("2000").mul(ethers.BigNumber.from("10").pow(8)); 
        const mockAggregator = await MockAggregatorFactory.deploy(8, initialOraclePrice);

        return { subscriptionContract, mockToken, mockAggregator, owner, user1, merchant, anotherUser, initialUserBalance, initialOraclePrice };
    }

    describe("Deployment", function () {
        it("Should deploy contracts successfully and set the right owner/values", async function () {
            const { subscriptionContract, mockToken, mockAggregator, owner, user1, initialUserBalance, initialOraclePrice } = await loadFixture(deploySubscriptionFixture);
            expect(subscriptionContract.address).to.not.be.undefined;
            expect(await subscriptionContract.owner()).to.equal(owner.address);
            
            expect(mockToken.address).to.not.be.undefined;
            expect(await mockToken.balanceOf(user1.address)).to.equal(initialUserBalance);
            expect(await mockToken.decimals()).to.equal(18);


            expect(mockAggregator.address).to.not.be.undefined;
            expect(await mockAggregator.decimals()).to.equal(8);
            const [, latestPrice, , ,] = await mockAggregator.latestRoundData();
            expect(latestPrice).to.equal(initialOraclePrice);
        });
    });

    describe("createPlan", function () {
        it("Should allow owner to create a fixed price plan and emit PlanCreated event", async function () {
            const { subscriptionContract, mockToken, owner } = await loadFixture(deploySubscriptionFixture);
            const fixedPrice = ethers.utils.parseUnits("10", 18); // 10 MTK
            const billingCycle = THIRTY_DAYS_IN_SECS;

            await expect(subscriptionContract.connect(owner).createPlan(
                mockToken.address,
                fixedPrice,
                billingCycle,
                false, // priceInUsd
                0,     // usdPrice
                ethers.constants.AddressZero // priceFeedAddress
            ))
                .to.emit(subscriptionContract, "PlanCreated")
                .withArgs(0, owner.address, mockToken.address, fixedPrice, billingCycle, false, 0, ethers.constants.AddressZero);

            const plan = await subscriptionContract.plans(0);
            expect(plan.merchant).to.equal(owner.address);
            expect(plan.token).to.equal(mockToken.address);
            expect(plan.price).to.equal(fixedPrice);
            expect(plan.billingCycle).to.equal(billingCycle);
            expect(plan.priceInUsd).to.be.false;
            expect(plan.usdPrice).to.equal(0);
            expect(plan.priceFeedAddress).to.equal(ethers.constants.AddressZero);
            expect(await subscriptionContract.nextPlanId()).to.equal(1);
        });

        it("Should allow owner to create a USD priced plan and emit PlanCreated event", async function () {
            const { subscriptionContract, mockToken, mockAggregator, owner } = await loadFixture(deploySubscriptionFixture);
            const usdPriceCents = 1000; // $10.00
            const billingCycle = THIRTY_DAYS_IN_SECS;

            await expect(subscriptionContract.connect(owner).createPlan(
                mockToken.address,
                0, // fixedPrice (not used)
                billingCycle,
                true,  // priceInUsd
                usdPriceCents,
                mockAggregator.address
            ))
                .to.emit(subscriptionContract, "PlanCreated")
                .withArgs(0, owner.address, mockToken.address, 0, billingCycle, true, usdPriceCents, mockAggregator.address);

            const plan = await subscriptionContract.plans(0);
            expect(plan.priceInUsd).to.be.true;
            expect(plan.usdPrice).to.equal(usdPriceCents);
            expect(plan.priceFeedAddress).to.equal(mockAggregator.address);
        });

        it("Should prevent non-owner from creating a plan", async function () {
            const { subscriptionContract, mockToken, user1 } = await loadFixture(deploySubscriptionFixture);
            await expect(subscriptionContract.connect(user1).createPlan(mockToken.address, 10, THIRTY_DAYS_IN_SECS, false, 0, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(subscriptionContract, "OwnableUnauthorizedAccount")
                .withArgs(user1.address);
        });

        it("Should revert if creating a USD plan with zero address for price feed", async function () {
            const { subscriptionContract, mockToken, owner } = await loadFixture(deploySubscriptionFixture);
            await expect(subscriptionContract.connect(owner).createPlan(
                mockToken.address, 0, THIRTY_DAYS_IN_SECS, true, 1000, ethers.constants.AddressZero
            )).to.be.revertedWith("Price feed address required for USD pricing");
        });
    });

    describe("subscribe (Fixed Price Plan)", function () {
        const planId = 0;
        const fixedPrice = ethers.utils.parseUnits("10", 18); // 10 MTK
        const billingCycle = THIRTY_DAYS_IN_SECS;

        async function fixtureWithFixedPlan() {
            const setup = await loadFixture(deploySubscriptionFixture);
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.mockToken.address, fixedPrice, billingCycle, false, 0, ethers.constants.AddressZero
            );
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
            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore.sub(fixedPrice));
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore.add(fixedPrice));
        });
        // ... other fixed price subscribe tests (non-existent plan, insufficient balance/allowance, already subscribed)
    });

    describe("subscribe (USD Priced Plan)", function () {
        const planId = 0;
        const usdPriceCents = 1000; // $10.00
        const billingCycle = THIRTY_DAYS_IN_SECS;
        const mockTokenDecimals = 18;
        const oracleDecimals = 8;

        async function fixtureWithUsdPlan() {
            const setup = await loadFixture(deploySubscriptionFixture);
            // Oracle price: $2000 / MTK
            await setup.mockAggregator.setLatestAnswer(ethers.BigNumber.from("2000").mul(ethers.BigNumber.from("10").pow(oracleDecimals)));
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.mockToken.address, 0, billingCycle, true, usdPriceCents, setup.mockAggregator.address
            );
            return setup;
        }

        it("Should allow user to subscribe, calculating correct token amount based on oracle price", async function () {
            const { subscriptionContract, mockToken, user1, owner, mockAggregator } = await loadFixture(fixtureWithUsdPlan);
            const merchantAddress = owner.address;

            const user1BalanceBefore = await mockToken.balanceOf(user1.address);
            const merchantBalanceBefore = await mockToken.balanceOf(merchantAddress);

            // Expected amount calculation:
            // (usdPriceCents * (10**tokenDecimals) * (10**oracleDecimals)) / (100 * oraclePrice)
            // (1000 * 10^18 * 10^8) / (100 * 2000 * 10^8)
            // = (1000 * 10^18) / (100 * 2000) = 10^18 / 200 = 0.005 * 10^18
            const expectedTokenAmount = ethers.BigNumber.from(usdPriceCents)
                .mul(ethers.BigNumber.from("10").pow(mockTokenDecimals))
                .mul(ethers.BigNumber.from("10").pow(oracleDecimals))
                .div(
                    ethers.BigNumber.from(100)
                    .mul(await (await mockAggregator.latestRoundData()).answer)
                );
            
            expect(expectedTokenAmount).to.equal(ethers.utils.parseUnits("0.005", 18));


            await expect(subscriptionContract.connect(user1).subscribe(planId))
                .to.emit(subscriptionContract, "Subscribed");

            const subscription = await subscriptionContract.userSubscriptions(user1.address, planId);
            expect(subscription.isActive).to.be.true;

            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore.sub(expectedTokenAmount));
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore.add(expectedTokenAmount));
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
    });

    describe("processPayment (Fixed Price Plan)", function () {
        const planId = 0;
        const fixedPrice = ethers.utils.parseUnits("10", 18);
        const billingCycle = THIRTY_DAYS_IN_SECS;

        async function fixtureWithActiveFixedSubscription() {
            const setup = await loadFixture(deploySubscriptionFixture);
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.mockToken.address, fixedPrice, billingCycle, false, 0, ethers.constants.AddressZero
            );
            await setup.subscriptionContract.connect(setup.user1).subscribe(planId);
            return setup;
        }

        it("Should process fixed price payment and emit PaymentProcessed", async function () {
            const { subscriptionContract, mockToken, user1, owner, anotherUser } = await loadFixture(fixtureWithActiveFixedSubscription);
            const merchantAddress = owner.address;

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate.add(1));

            const user1BalanceBefore = await mockToken.balanceOf(user1.address);
            const merchantBalanceBefore = await mockToken.balanceOf(merchantAddress);

            await expect(subscriptionContract.connect(anotherUser).processPayment(user1.address, planId))
                .to.emit(subscriptionContract, "PaymentProcessed")
                .withArgs(user1.address, planId, fixedPrice, (val: any) => val.gt(subDetails.nextPaymentDate));

            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore.sub(fixedPrice));
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore.add(fixedPrice));
        });
        // ... other fixed price processPayment tests (not active, not due, insufficient funds/allowance)
    });

    describe("processPayment (USD Priced Plan)", function () {
        const planId = 0;
        const usdPriceCents = 1000; // $10.00
        const billingCycle = THIRTY_DAYS_IN_SECS;
        const mockTokenDecimals = 18;
        const oracleDecimals = 8;

        async function fixtureWithActiveUsdSubscription() {
            const setup = await loadFixture(deploySubscriptionFixture);
            // Initial oracle price: $2000 / MTK
            await setup.mockAggregator.setLatestAnswer(ethers.BigNumber.from("2000").mul(ethers.BigNumber.from("10").pow(oracleDecimals)));
            await setup.subscriptionContract.connect(setup.owner).createPlan(
                setup.mockToken.address, 0, billingCycle, true, usdPriceCents, setup.mockAggregator.address
            );
            await setup.subscriptionContract.connect(setup.user1).subscribe(planId); // Initial payment based on $2000/MTK
            return setup;
        }

        it("Should process USD payment with updated oracle price, calculating new token amount", async function () {
            const { subscriptionContract, mockToken, mockAggregator, user1, owner, anotherUser } = await loadFixture(fixtureWithActiveUsdSubscription);
            const merchantAddress = owner.address;

            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate.add(1));

            // Update oracle price: $2500 / MTK
            const newOraclePrice = ethers.BigNumber.from("2500").mul(ethers.BigNumber.from("10").pow(oracleDecimals));
            await mockAggregator.setLatestAnswer(newOraclePrice);

            const user1BalanceBefore = await mockToken.balanceOf(user1.address);
            const merchantBalanceBefore = await mockToken.balanceOf(merchantAddress);

            // Expected amount calculation with new price:
            // (1000 * 10^18 * 10^8) / (100 * 2500 * 10^8)
            // = (1000 * 10^18) / (100 * 2500) = 10^18 / 250 = 0.004 * 10^18
            const expectedTokenAmount = ethers.BigNumber.from(usdPriceCents)
                .mul(ethers.BigNumber.from("10").pow(mockTokenDecimals))
                .mul(ethers.BigNumber.from("10").pow(oracleDecimals))
                .div(
                    ethers.BigNumber.from(100)
                    .mul(newOraclePrice)
                );
            expect(expectedTokenAmount).to.equal(ethers.utils.parseUnits("0.004", 18));

            await expect(subscriptionContract.connect(anotherUser).processPayment(user1.address, planId))
                .to.emit(subscriptionContract, "PaymentProcessed")
                .withArgs(user1.address, planId, expectedTokenAmount, (val: any) => val.gt(subDetails.nextPaymentDate));
            
            expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore.sub(expectedTokenAmount));
            expect(await mockToken.balanceOf(merchantAddress)).to.equal(merchantBalanceBefore.add(expectedTokenAmount));

            const newSubDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            const currentTime = await time.latest();
            expect(newSubDetails.nextPaymentDate).to.be.closeTo(currentTime + billingCycle, 5);
        });

        it("Should revert processPayment if oracle price is zero", async function () {
            const { subscriptionContract, mockAggregator, user1, anotherUser } = await loadFixture(fixtureWithActiveUsdSubscription);
            let subDetails = await subscriptionContract.userSubscriptions(user1.address, planId);
            await time.increaseTo(subDetails.nextPaymentDate.add(1));
            await mockAggregator.setLatestAnswer(0);
            await expect(subscriptionContract.connect(anotherUser).processPayment(user1.address, planId))
                .to.be.revertedWith("Oracle price must be positive");
        });
    });
    // Keep existing general failure tests for subscribe/processPayment (non-existent plan, not active, not due, insufficient funds)
    // and adapt them if necessary or duplicate for USD plans if behavior might differ.
    // For example, "Should revert if subscribing to a non-existent plan" is generic.
    // "Should revert if token transfer fails (insufficient balance)" needs to be tested for both fixed and dynamic pricing.
});
