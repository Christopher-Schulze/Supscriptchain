import { expect } from 'chai';
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';

it('exits when graph-node fails to spawn', function () {
  const logFile = 'subgraph-server.test.log';
  const res = spawnSync('node', ['-r', 'ts-node/register/transpile-only', 'scripts/subgraph-server.ts'], {
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

it('shuts down on SIGTERM', function (done) {
  const logFile = 'subgraph-server.signal.log';
  const child = spawn(
    'node',
    ['-r', 'ts-node/register/transpile-only', 'scripts/subgraph-server.ts'],
    {
      env: {
        ...process.env,
        GRAPH_NODE_CMD: 'node',
        GRAPH_NODE_ARGS: "-e setTimeout(() => {}, 10000)",
        LOG_FILE: logFile,
      },
      stdio: 'ignore',
    },
  );

  child.on('exit', (code) => {
    fs.unlinkSync(logFile);
    try {
      expect(code).to.equal(0);
      done();
    } catch (err) {
      done(err as Error);
    }
  });

  setTimeout(() => {
    child.kill('SIGTERM');
  }, 500);
});
