import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import http from 'http';
import util from 'util';
import pino from 'pino';
import {
  Counter,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

type LogLevel = 'info' | 'error' | 'warn';
type LogFn = (level: LogLevel, ...args: any[]) => void;

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
const logFile = process.env.LOG_FILE || process.env.GRAPH_NODE_LOG || 'graph-node.log';
const lokiUrl = process.env.LOKI_URL;
const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const metricsPort = parseInt(process.env.METRICS_PORT || '9091', 10);

let lokiLogger: pino.Logger | null = null;
if (lokiUrl) {
  const transport = pino.transport({
    targets: [
      {
        target: 'pino-loki',
        options: { host: lokiUrl },
        level: 'info',
      },
    ],
  });
  lokiLogger = pino(transport);
}

const levels: LogLevel[] = ['error', 'warn', 'info'];
const levelIdx = levels.indexOf(logLevel);

const log: LogFn = (level, ...args) => {
  if (levels.indexOf(level) > levelIdx) return;
  const msg = util.format(...args);
  if (level === 'error') {
    console.error(msg);
  } else if (level === 'warn') {
    console.warn(msg);
  } else {
    console.log(msg);
  }
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  if (logFile) {
    fs.appendFileSync(logFile, line);
  }
  lokiLogger?.[level](msg);
};
const register = new Registry();
collectDefaultMetrics({ register });
const restartCounter = new Counter({
  name: 'graph_node_restarts_total',
  help: 'Total number of graph-node restarts',
  registers: [register],
});
const healthFailures = new Counter({
  name: 'graph_node_health_failures_total',
  help: 'Total number of failed health checks',
  registers: [register],
});
const healthStatus = new Gauge({
  name: 'graph_node_health_status',
  help: '1 if last health check succeeded, 0 otherwise',
  registers: [register],
});
const metricsServer = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});
metricsServer.listen(metricsPort, () => {
  log('info', `Metrics server listening on port ${metricsPort}`);
});
let child: ChildProcess;
let fails = 0;


function start() {
  try {
    child = spawn(cmd, args, { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to spawn graph-node:', err);
    log('error', `Spawn error: ${(err as Error).message}`);
    process.exit(1);
  }
  fails = 0;
  log('info', `Started graph-node with PID ${child.pid}`);
  child.on('error', (err) => {
    console.error('Failed to start graph-node:', err);
    log('error', `Start error: ${err.message}`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    const msg = `graph-node exited with code ${code} signal ${signal}, restarting in ${restartDelay}ms`;
    console.error(msg);
    log('warn', msg);
    restartCounter.inc();
    setTimeout(start, restartDelay);
  });
}

function restart() {
  try {
    child.kill();
  } catch {}
  log('warn', 'Restarting graph-node');
  restartCounter.inc();
  setTimeout(start, restartDelay);
}

function check() {
  http
    .get(healthUrl, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Healthcheck failed with status ${res.statusCode}`);
        healthFailures.inc();
        healthStatus.set(0);
        if (++fails >= maxFails) {
          const msg = 'Max health check failures reached, restarting...';
          console.error(msg);
          log('warn', msg);
          fails = 0;
          restart();
        }
      } else {
        fails = 0;
        healthStatus.set(1);
      }
    })
    .on('error', (err) => {
      console.error('Healthcheck error:', err.message);
      healthFailures.inc();
      healthStatus.set(0);
      if (++fails >= maxFails) {
        const msg = 'Max health check errors reached, restarting...';
        console.error(msg);
        log('warn', msg);
        fails = 0;
        restart();
      }
    });
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  log('error', `Unhandled rejection: ${String(err)}`);
});

start();
setInterval(check, healthInterval);
