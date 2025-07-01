import fs from 'fs';
import path from 'path';

function parseArgs() {
  const result: { network?: string; address?: string } = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--network' && args[i + 1]) {
      result.network = args[i + 1];
      i++;
    } else if (arg.startsWith('--network=')) {
      result.network = arg.split('=')[1];
    } else if (arg === '--address' && args[i + 1]) {
      result.address = args[i + 1];
      i++;
    } else if (arg.startsWith('--address=')) {
      result.address = arg.split('=')[1];
    }
  }

  return result;
}

const { network: networkArg, address: addressArg } = parseArgs();

const network = networkArg || process.env.NETWORK;
const address = addressArg || process.env.CONTRACT_ADDRESS;

if (!network || !address) {
  console.error(
    'NETWORK/--network and CONTRACT_ADDRESS/--address must be provided'
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

