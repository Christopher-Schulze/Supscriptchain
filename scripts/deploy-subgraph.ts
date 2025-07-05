import { spawnSync } from 'child_process';
import { config } from 'dotenv';

function run(cmd: string, args: string[], env = process.env): void {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function main() {
  const graphNode = process.env.GRAPH_NODE_URL;
  const ipfs = process.env.IPFS_URL;
  const name = process.env.SUBGRAPH_NAME || 'subscription-subgraph';
  const token = process.env.GRAPH_ACCESS_TOKEN;
  const version = process.env.SUBGRAPH_VERSION;

  if (!graphNode || !ipfs) {
    console.error('GRAPH_NODE_URL and IPFS_URL must be set');
    process.exit(1);
  }

  // Build the subgraph using existing npm script
  run('npm', ['run', 'build-subgraph']);

  // Deploy using graph-cli
  const args = [
    'graph',
    'deploy',
    '--node',
    graphNode,
    '--ipfs',
    ipfs,
  ];
  if (token) {
    args.push('--access-token', token);
  }
  if (version) {
    args.push('--version-label', version);
  }
  args.push(name, 'subgraph/subgraph.local.yaml');
  run('npx', args);
}

if (require.main === module) {
  config();
  main();
}
