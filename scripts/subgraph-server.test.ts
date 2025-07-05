import { expect } from 'chai';
import { spawnSync } from 'child_process';
import fs from 'fs';

it('exits when graph-node fails to spawn', function () {
  const logFile = 'subgraph-server.test.log';
  const res = spawnSync('node', ['scripts/subgraph-server.ts'], {
    env: {
      ...process.env,
      GRAPH_NODE_CMD: 'nonexistent-cmd',
      GRAPH_NODE_HEALTH_INTERVAL: '1',
      LOG_FILE: logFile,
    },
    encoding: 'utf8',
  });
  const contents = fs.readFileSync(logFile, 'utf8');
  fs.unlinkSync(logFile);
  expect(res.status).to.equal(1);
  expect(res.stderr).to.include('Failed to spawn graph-node');
  expect(contents).to.match(/Spawn error/);
});
