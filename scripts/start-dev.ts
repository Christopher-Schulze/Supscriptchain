#!/usr/bin/env node
const { concurrently } = require('concurrently');

concurrently(
  [
    { command: 'npx hardhat node', name: 'hardhat', prefixColor: 'blue' },
    { command: 'npm run subgraph-server', name: 'subgraph', prefixColor: 'magenta' },
    { command: 'npm --prefix frontend run dev', name: 'frontend', prefixColor: 'green' },
  ],
  {
    killOthers: ['failure', 'success'],
  }
).result.catch(() => process.exit(1));
