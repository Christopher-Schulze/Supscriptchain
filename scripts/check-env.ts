import fs from 'fs';
import path from 'path';

export function checkEnv(): void {
  const envExamplePath = path.resolve(__dirname, '..', '.env.example');
  const lines = fs.readFileSync(envExamplePath, 'utf-8').split(/\r?\n/);
  const keys = lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0]);
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
