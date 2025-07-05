import fs from 'fs';
import util from 'util';
import pino from 'pino';

export type LogLevel = 'info' | 'error' | 'warn';
export type LogFn = (level: LogLevel, ...args: any[]) => void;

export interface LoggerOptions {
  logFile?: string;
  lokiUrl?: string;
  logLevel?: LogLevel;
}

export function createLogger(options: LoggerOptions): LogFn {
  const { logFile, lokiUrl, logLevel = 'info' } = options;

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

  return (level, ...args) => {
    if (levels.indexOf(level) > levelIdx) return;
    const msg = util.format(...args);
    if (level === 'error') {
      console.error(msg);
    } else if (level === 'warn') {
      console.warn(msg);
    } else {
      console.log(msg);
    }
    if (logFile) {
      const line = `[${new Date().toISOString()}] ${msg}\n`;
      fs.appendFileSync(logFile, line);
    }
    lokiLogger?.[level](msg);
  };
}
