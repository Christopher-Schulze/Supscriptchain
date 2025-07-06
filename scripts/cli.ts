import { Command } from 'commander';
import { config as dotenvConfig } from 'dotenv';

// Extract network argument before requiring hardhat
function extractNetwork(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--network' || arg === '-n') {
      return args[i + 1];
    }
    if (arg.startsWith('--network=')) {
      return arg.split('=')[1];
    }
  }
  return undefined;
}

const network = extractNetwork(process.argv.slice(2));
if (network) {
  process.env.HARDHAT_NETWORK = network;
}

dotenvConfig();

async function loadHardhat() {
  return await import('hardhat');
}

async function listPlans(opts: { subscription?: string }) {
  const { ethers } = await loadHardhat();
  const address = opts.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
  if (!address) {
    throw new Error('subscription address missing');
  }
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt('SubscriptionUpgradeable', address, signer);
  const nextId = await contract.nextPlanId();
  for (let i = 0n; i < nextId; i++) {
    const p = await contract.plans(i);
    const info = {
      id: i.toString(),
      merchant: p.merchant,
      token: p.token,
      tokenDecimals: p.tokenDecimals.toString(),
      price: p.price.toString(),
      billingCycle: p.billingCycle.toString(),
      priceInUsd: p.priceInUsd,
      usdPrice: p.usdPrice.toString(),
      priceFeedAddress: p.priceFeedAddress,
      active: p.active,
    };
    console.log(JSON.stringify(info, null, 2));
  }
}

async function createPlan(opts: any) {
  const { run } = await loadHardhat();
  await run('create-plan', opts);
}

async function updatePlan(opts: any) {
  const { run } = await loadHardhat();
  await run('update-plan', opts);
}

async function pauseContract(opts: any) {
  const { run } = await loadHardhat();
  await run('pause', opts);
}

async function unpauseContract(opts: any) {
  const { run } = await loadHardhat();
  await run('unpause', opts);
}

async function disablePlan(opts: any) {
  const { run } = await loadHardhat();
  await run('disable-plan', opts);
}

async function showStatus(opts: any) {
  const { run } = await loadHardhat();
  await run('status', opts);
}

async function updateMerchant(opts: any) {
  const { run } = await loadHardhat();
  await run('update-merchant', opts);
}

const program = new Command();
program
  .name('supscript-cli')
  .description('Manage subscription plans')
  .option('-n, --network <name>', 'Hardhat network');

program
  .command('list')
  .description('List existing plans')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .action((opts) => listPlans(opts));

program
  .command('create')
  .description('Create a new plan')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .option('-m, --merchant <address>', 'Merchant address')
  .option('-t, --token <address>', 'ERC20 token address')
  .option('-p, --price <price>', 'Token price')
  .option('-b, --billing-cycle <seconds>', 'Billing cycle in seconds')
  .option('--price-in-usd', 'Price denominated in USD')
  .option('--usd-price <amount>', 'USD price (cents)')
  .option('--price-feed <address>', 'Chainlink price feed address')
  .action((opts) => createPlan(opts));

program
  .command('update')
  .description('Update an existing plan')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .option('-i, --plan-id <id>', 'Plan ID')
  .option('-b, --billing-cycle <seconds>', 'Billing cycle in seconds')
  .option('-p, --price <price>', 'Token price')
  .option('--price-in-usd', 'Price denominated in USD')
  .option('--usd-price <amount>', 'USD price (cents)')
  .option('--price-feed <address>', 'Chainlink price feed address')
  .action((opts) => updatePlan({
    subscription: opts.subscription,
    planId: opts.planId,
    billingCycle: opts.billingCycle,
    price: opts.price,
    priceInUsd: opts.priceInUsd,
    usdPrice: opts.usdPrice,
    priceFeed: opts.priceFeed,
  }));

program
  .command('pause')
  .description('Pause the subscription contract')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .action((opts) => pauseContract(opts));

program
  .command('unpause')
  .description('Unpause the subscription contract')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .action((opts) => unpauseContract(opts));

program
  .command('status')
  .description('Show subscription contract status')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .action((opts) => showStatus(opts));

program
  .command('disable')
  .description('Disable a subscription plan')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .option('-i, --plan-id <id>', 'Plan ID')
  .action((opts) => disablePlan(opts));

program
  .command('update-merchant')
  .description('Update the merchant of a plan')
  .option('-s, --subscription <address>', 'Subscription contract address')
  .option('-i, --plan-id <id>', 'Plan ID')
  .option('-m, --merchant <address>', 'New merchant address')
  .action((opts) => updateMerchant(opts));

const parsePromise = (program as any).parseAsync
  ? (program as any).parseAsync(process.argv)
  : Promise.resolve(program.parse(process.argv));
parsePromise.catch((err: any) => {
  console.error(err);
  process.exitCode = 1;
});

