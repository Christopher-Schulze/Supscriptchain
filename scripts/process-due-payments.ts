import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const contractAddress = process.env.SUBSCRIPTION_ADDRESS;
  if (!contractAddress) {
    throw new Error("SUBSCRIPTION_ADDRESS not set");
  }
  const planId = parseInt(process.env.PLAN_ID || "0", 10);
  const listPath = process.env.SUBSCRIBERS_FILE || path.join(__dirname, "subscribers.json");

  const provider = ethers.provider;
  const merchantPk = process.env.MERCHANT_PRIVATE_KEY;
  const signer = merchantPk ? new ethers.Wallet(merchantPk, provider) : (await ethers.getSigners())[0];
  const subscription = await ethers.getContractAt("Subscription", contractAddress, signer);

  const subscribers: string[] = JSON.parse(fs.readFileSync(listPath, "utf8"));
  const now = Math.floor(Date.now() / 1000);

  for (const user of subscribers) {
    try {
      const sub = await subscription.userSubscriptions(user, planId);
      if (sub.isActive && sub.nextPaymentDate.toNumber() <= now) {
        const tx = await subscription.processPayment(user, planId);
        await tx.wait();
        console.log(`Processed payment for ${user}`);
      }
    } catch (err) {
      console.error(`Failed to process payment for ${user}:`, err);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
