import fs from 'fs';
import path from 'path';

function loadGraphConfig() {
  const cfg = path.join(__dirname, '../subgraph/graph.config.json');
  if (fs.existsSync(cfg)) {
    try {
      const data = JSON.parse(fs.readFileSync(cfg, 'utf8')) as Record<string, string>;
      for (const [key, value] of Object.entries(data)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch (err) {
      console.warn(`Failed to parse ${cfg}: ${(err as Error).message}`);
    }
  }
}

function parseArgs() {
  const result: { network?: string; address?: string } = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--network':
      case '-n':
        result.network = args[++i];
        break;
      case '--address':
      case '-a':
        result.address = args[++i];
        break;
      default:
        if (arg.startsWith('--network=')) {
          result.network = arg.split('=')[1];
        } else if (arg.startsWith('--address=')) {
          result.address = arg.split('=')[1];
        }
    }
  }

  return result;
}

loadGraphConfig();
const { network: networkArg, address: addressArg } = parseArgs();

function detectNetwork(): string | undefined {
  if (process.env.HARDHAT_NETWORK) return process.env.HARDHAT_NETWORK;

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (fs.existsSync(deploymentsDir)) {
    const entries = fs
      .readdirSync(deploymentsDir)
      .filter((d) => fs.statSync(path.join(deploymentsDir, d)).isDirectory());
    if (entries.length === 1) return entries[0];
  }

  const ozDir = path.join(__dirname, '../.openzeppelin');
  if (fs.existsSync(ozDir)) {
    const files = fs.readdirSync(ozDir).filter((f) => f.endsWith('.json'));
    if (files.length === 1) return path.basename(files[0], '.json');
  }
  return undefined;
}

function loadAddress(net: string): string | undefined {
  const base = path.join(__dirname, '../deployments', net);
  if (fs.existsSync(base)) {
    for (const name of ['SubscriptionUpgradeable.json', 'Subscription.json']) {
      const file = path.join(base, name);
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (data.address) return data.address as string;
        } catch {}
      }
    }
  }

  const ozFile = path.join(__dirname, '../.openzeppelin', `${net}.json`);
  if (fs.existsSync(ozFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(ozFile, 'utf8'));
      const proxy = data.proxies?.[0]?.address as string | undefined;
      if (proxy) return proxy;
    } catch {}
  }

  return undefined;
}

let network = networkArg || process.env.NETWORK;
let address = addressArg || process.env.CONTRACT_ADDRESS;

if (!network) {
  network = detectNetwork();
}

if (network && !address) {
  address = loadAddress(network);
}

if (!network || !address) {
  console.error(
    'Usage: ts-node scripts/prepare-subgraph.ts --network <name> --address <0x...>',
  );
  process.exit(1);
}

const inputPath = path.join(__dirname, '../subgraph/subgraph.yaml');
const outputPath = path.join(__dirname, '../subgraph/subgraph.local.yaml');

let yaml = fs.readFileSync(inputPath, 'utf8');
yaml = yaml
  .replace(/{{NETWORK}}/g, network)
  .replace(/{{CONTRACT_ADDRESS}}/g, address)
  .replace(
    /..\/artifacts\/contracts\/Subscription\.sol\/Subscription\.json/g,
    '../artifacts/contracts/SubscriptionUpgradeable.sol/SubscriptionUpgradeable.json',
  );

fs.writeFileSync(outputPath, yaml);
console.log(`Wrote ${outputPath}`);
