import { ethers, upgrades } from "hardhat";

async function main() {
  const merchant = process.env.MERCHANT_ADDRESS || ethers.constants.AddressZero;
  const token = process.env.TOKEN_ADDRESS || ethers.constants.AddressZero;
  const priceFeed = process.env.PRICE_FEED || ethers.constants.AddressZero;
  const billingCycle = parseInt(process.env.BILLING_CYCLE || "2592000", 10);
  const priceInUsd = process.env.PRICE_IN_USD === "true";
  const fixedPrice = process.env.FIXED_PRICE || "0";
  const usdPrice = parseInt(process.env.USD_PRICE || "0", 10);

  const [deployer] = await ethers.getSigners();
  const SubscriptionFactory = await ethers.getContractFactory(
    "SubscriptionUpgradeable"
  );
  const subscription = await upgrades.deployProxy(
    SubscriptionFactory,
    [deployer.address],
    { kind: "transparent" }
  );
  await subscription.waitForDeployment();
  console.log("Subscription proxy deployed to:", await subscription.getAddress());

  if (token !== ethers.constants.AddressZero) {
    const tx = await subscription.createPlan(
      merchant,
      token,
      fixedPrice,
      billingCycle,
      priceInUsd,
      usdPrice,
      priceFeed
    );
    await tx.wait();
    console.log("Initial plan created");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
