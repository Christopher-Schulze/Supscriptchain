import { spawnSync } from 'child_process';
import { config } from 'dotenv';

/**
 * Build and deploy the subgraph using `graph deploy`.
 *
 * Example remote deployment:
 * `GRAPH_NODE_URL=https://node.example.com:8020 IPFS_URL=https://node.example.com:5001 ts-node scripts/deploy-subgraph.ts --token <access> --version v1.0.0`
 */

function parseArgs() {
  const result: { version?: string; token?: string } = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--version':
      case '-v':
        result.version = args[++i];
        break;
      case '--token':
      case '-t':
        result.token = args[++i];
        break;
      default:
        if (arg.startsWith('--version=')) {
          result.version = arg.split('=')[1];
        } else if (arg.startsWith('--token=')) {
          result.token = arg.split('=')[1];
        }
    }
  }
  return result;
}

function run(cmd: string, args: string[], env = process.env): void {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function main() {
  const { token: tokenArg, version: versionArg } = parseArgs();
  const graphNode = process.env.GRAPH_NODE_URL;
  const ipfs = process.env.IPFS_URL;
  const name = process.env.SUBGRAPH_NAME || 'subscription-subgraph';
  const token = tokenArg || process.env.GRAPH_ACCESS_TOKEN;
  const version = versionArg || process.env.SUBGRAPH_VERSION;

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
