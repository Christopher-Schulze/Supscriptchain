import fs from 'fs';
import path from 'path';

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

const { network: networkArg, address: addressArg } = parseArgs();

function detectNetwork(): string | undefined {
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) return undefined;
  const entries = fs
    .readdirSync(deploymentsDir)
    .filter((d) => fs.statSync(path.join(deploymentsDir, d)).isDirectory());
  return entries.length === 1 ? entries[0] : undefined;
}

function loadAddress(net: string): string | undefined {
  const base = path.join(__dirname, '../deployments', net);
  if (!fs.existsSync(base)) return undefined;
  for (const name of ['SubscriptionUpgradeable.json', 'Subscription.json']) {
    const file = path.join(base, name);
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (data.address) return data.address as string;
      } catch {}
    }
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
    'Usage: ts-node scripts/prepare-subgraph.ts --network <name> --address <0x...>'
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
    '../artifacts/contracts/SubscriptionUpgradeable.sol/SubscriptionUpgradeable.json'
  );

fs.writeFileSync(outputPath, yaml);
console.log(`Wrote ${outputPath}`);

