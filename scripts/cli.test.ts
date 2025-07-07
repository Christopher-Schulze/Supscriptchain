import { expect } from 'chai';
import { spawnSync, spawn } from 'child_process';
import http from 'http';

function run(args: string[]) {
  return spawnSync(
    'node',
    ['-r', 'ts-node/register/transpile-only', 'scripts/cli.ts', ...args],
    { encoding: 'utf8' },
  );
}

describe('cli.ts', function () {
  this.timeout(20000);
  it('shows global help', function () {
    const res = run(['--help']);
    expect(res.stdout).to.contain('Manage subscription plans');
  });

  it('shows help for subcommands', function () {
    expect(run(['list', '--help']).stdout).to.contain('List existing plans');
    expect(run(['create', '--help']).stdout).to.contain('Create a new plan');
    expect(run(['update', '--help']).stdout).to.contain(
      'Update an existing plan',
    );
    expect(run(['pause', '--help']).stdout).to.contain(
      'Pause the subscription contract',
    );
    expect(run(['unpause', '--help']).stdout).to.contain(
      'Unpause the subscription contract',
    );
    expect(run(['disable', '--help']).stdout).to.contain(
      'Disable a subscription plan',
    );
    expect(run(['update-merchant', '--help']).stdout).to.contain(
      'Update the merchant of a plan',
    );
  });

  it('shows help for status command', function () {
    const res = run(['status', '--help']);
    expect(res.stdout).to.contain('Show subscription contract status');
  });

  it('fails when subscription is missing', function () {
    const res = run(['list']);
    expect(res.status).to.equal(1);
    expect(res.stderr).to.match(/subscription address missing/i);
  });

  it('returns json error with --json', function () {
    const res = run(['list', '--json']);
    expect(res.status).to.equal(1);
    const lines = res.stderr.trim().split(/\r?\n/);
    const obj = JSON.parse(lines[lines.length - 1]);
    expect(obj.error).to.match(/subscription address missing/i);
  });

  it('summarizes metrics endpoints', async function () {
    const subMetrics =
      'graph_node_restarts_total 2\ngraph_node_health_failures_total 1\n';
    const payMetrics =
      'payment_success_total{plan_id="0"} 3\n' +
      'payment_failure_total{plan_id="0"} 1\n' +
      'payment_success_total{plan_id="1"} 2\n';

    function startServer(port: number, body: string) {
      const child = spawn(
        'node',
        [
          '-e',
          `const http=require('http');\n` +
            `const metrics=${JSON.stringify(body)};\n` +
            `const server=http.createServer((req,res)=>{\n` +
            `  if(req.url==='/metrics') res.end(metrics);\n` +
            `  else {res.statusCode=404; res.end();}\n` +
            `});\n` +
            `server.listen(${port},()=>{console.log('ready');});\n` +
            `process.on('SIGTERM',()=>server.close(()=>process.exit(0)));`,
        ],
        { stdio: ['ignore', 'pipe', 'inherit'] },
      );
      return new Promise<{ proc: ReturnType<typeof spawn> }>((resolve) => {
        child.stdout.once('data', () => resolve({ proc: child }));
      });
    }

    const sub = await startServer(9101, subMetrics);
    const pay = await startServer(9102, payMetrics);

    const res = run([
      'metrics',
      '--subgraph',
      'http://localhost:9101/metrics',
      '--payments',
      'http://localhost:9102/metrics',
    ]);

    sub.proc.kill();
    pay.proc.kill();

    expect(res.status).to.equal(0);
    expect(res.stdout).to.match(/restarts:\s*2/);
    expect(res.stdout).to.match(/plan 0: 3 success, 1 failure/);
    expect(res.stdout).to.match(/plan 1: 2 success, 0 failure/);
  });

  it('summarizes metrics via mocked servers', async function () {
    const subMetrics =
      'graph_node_restarts_total 5\n' + 'graph_node_health_failures_total 0\n';
    const payMetrics =
      'payment_success_total{plan_id="2"} 7\n' +
      'payment_failure_total{plan_id="2"} 2\n';

    function startServer(port: number, body: string) {
      const child = spawn(
        'node',
        [
          '-e',
          `const http=require('http');\n` +
            `const metrics=${JSON.stringify(body)};\n` +
            `const server=http.createServer((req,res)=>{\n` +
            `  if(req.url==='/metrics') res.end(metrics);\n` +
            `  else {res.statusCode=404; res.end();}\n` +
            `});\n` +
            `server.listen(${port},()=>{console.log('ready');});\n` +
            `process.on('SIGTERM',()=>server.close(()=>process.exit(0)));`,
        ],
        { stdio: ['ignore', 'pipe', 'inherit'] },
      );
      return new Promise<{ proc: ReturnType<typeof spawn> }>((resolve) => {
        child.stdout.once('data', () => resolve({ proc: child }));
      });
    }

    const sub = await startServer(9103, subMetrics);
    const pay = await startServer(9104, payMetrics);

    const res = run([
      'metrics',
      '--subgraph',
      'http://localhost:9103/metrics',
      '--payments',
      'http://localhost:9104/metrics',
    ]);

    sub.proc.kill();
    pay.proc.kill();

    expect(res.status).to.equal(0);
    expect(res.stdout).to.match(/restarts:\s*5/);
    expect(res.stdout).to.match(/plan 2: 7 success, 2 failure/);
  });
});
