import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import http from 'http';

const cmd = process.env.GRAPH_NODE_CMD || 'graph-node';
const args = process.env.GRAPH_NODE_ARGS ? process.env.GRAPH_NODE_ARGS.split(' ') : [];
const healthUrl = process.env.GRAPH_NODE_HEALTH || 'http://localhost:8000/health';
let child: ChildProcessWithoutNullStreams;

function start() {
  child = spawn(cmd, args, { stdio: 'inherit' });
  child.on('error', (err) => {
    console.error('Failed to start graph-node:', err);
  });
  child.on('exit', (code, signal) => {
    console.error(`graph-node exited with code ${code} signal ${signal}, restarting in 5s`);
    setTimeout(start, 5000);
  });
}

function check() {
  http
    .get(healthUrl, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Healthcheck failed with status ${res.statusCode}`);
      }
    })
    .on('error', (err) => {
      console.error('Healthcheck error:', err.message);
    });
}

start();
setInterval(check, 60000);
