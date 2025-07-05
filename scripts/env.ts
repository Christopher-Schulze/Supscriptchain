import { checkEnv } from './check-env';

export function loadEnv(): NodeJS.ProcessEnv {
  checkEnv();
  return process.env as NodeJS.ProcessEnv;
}
