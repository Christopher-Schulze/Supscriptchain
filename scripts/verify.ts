import { run } from "hardhat";

async function main() {
  const proxy = process.env.SUBSCRIPTION_ADDRESS || "";
  const implementation = process.env.IMPLEMENTATION_ADDRESS || "";

  if (proxy) {
    await run("verify:verify", { address: proxy });
  }

  if (implementation) {
    await run("verify:verify", { address: implementation });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
