import { expect } from 'chai';
import { spawnSync } from 'child_process';

it('exits when graph-node fails to spawn', function () {
  const res = spawnSync('node', ['scripts/subgraph-server.ts'], {
    env: {
      ...process.env,
      GRAPH_NODE_CMD: 'nonexistent-cmd',
      GRAPH_NODE_HEALTH_INTERVAL: '1',
    },
    encoding: 'utf8',
  });
  expect(res.status).to.equal(1);
  expect(res.stderr).to.include('Failed to spawn graph-node');
});
