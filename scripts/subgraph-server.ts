import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import http from 'http';

const cmd = process.env.GRAPH_NODE_CMD || 'graph-node';
const args = process.env.GRAPH_NODE_ARGS
  ? process.env.GRAPH_NODE_ARGS.split(' ')
  : [];
const healthUrl =
  process.env.GRAPH_NODE_HEALTH || 'http://localhost:8000/health';
const healthInterval = parseInt(
  process.env.GRAPH_NODE_HEALTH_INTERVAL || '60000',
  10,
);
const restartDelay = parseInt(
  process.env.GRAPH_NODE_RESTART_DELAY || '5000',
  10,
);
const maxFails = parseInt(process.env.GRAPH_NODE_MAX_FAILS || '3', 10);
const logPath = process.env.GRAPH_NODE_LOG || 'graph-node.log';
let child: ChildProcessWithoutNullStreams;
let fails = 0;

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, line);
}

function start() {
  child = spawn(cmd, args, { stdio: 'inherit' });
  fails = 0;
  log(`Started graph-node with PID ${child.pid}`);
  child.on('error', (err) => {
    console.error('Failed to start graph-node:', err);
    log(`Start error: ${err.message}`);
  });
  child.on('exit', (code, signal) => {
    const msg = `graph-node exited with code ${code} signal ${signal}, restarting in ${restartDelay}ms`;
    console.error(msg);
    log(msg);
    setTimeout(start, restartDelay);
  });
}

function restart() {
  try {
    child.kill();
  } catch {}
  log('Restarting graph-node');
  setTimeout(start, restartDelay);
}

function check() {
  http
    .get(healthUrl, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Healthcheck failed with status ${res.statusCode}`);
        if (++fails >= maxFails) {
          const msg = 'Max health check failures reached, restarting...';
          console.error(msg);
          log(msg);
          fails = 0;
          restart();
        }
      } else {
        fails = 0;
      }
    })
    .on('error', (err) => {
      console.error('Healthcheck error:', err.message);
      if (++fails >= maxFails) {
        const msg = 'Max health check errors reached, restarting...';
        console.error(msg);
        log(msg);
        fails = 0;
        restart();
      }
    });
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  log(`Unhandled rejection: ${String(err)}`);
});

start();
setInterval(check, healthInterval);
