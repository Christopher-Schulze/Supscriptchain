import fs from 'fs';
import path from 'path';

const network = process.env.NETWORK;
const address = process.env.CONTRACT_ADDRESS;

if (!network || !address) {
  console.error('NETWORK and CONTRACT_ADDRESS env vars must be set');
  process.exit(1);
}

const inputPath = path.join(__dirname, '../subgraph/subgraph.yaml');
const outputPath = path.join(__dirname, '../subgraph/subgraph.local.yaml');

let yaml = fs.readFileSync(inputPath, 'utf8');
yaml = yaml.replace(/{{NETWORK}}/g, network).replace(/{{CONTRACT_ADDRESS}}/g, address);

fs.writeFileSync(outputPath, yaml);
console.log(`Wrote ${outputPath}`);

