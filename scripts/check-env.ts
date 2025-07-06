import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { z } from 'zod';

export function checkEnv(): void {
  const envPath = path.resolve(__dirname, '..', '.env');
  config({ path: envPath, quiet: true });

  const optionalKeys = new Set(['METRICS_PORT', 'LOKI_URL']);

  const envExamplePath = path.resolve(__dirname, '..', '.env.example');
  const lines = fs.readFileSync(envExamplePath, 'utf-8').split(/\r?\n/);
  const keys = lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0]);

  const missing = keys.filter(
    (key) => !process.env[key] && !optionalKeys.has(key),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
  const numberString = z.coerce.number();
  const boolString = z.enum(['true', 'false']);

  const schema = z.object({
    MERCHANT_ADDRESS: address,
    TOKEN_ADDRESS: address,
    PRICE_FEED: address,
    SUBSCRIPTION_ADDRESS: address,
    BILLING_CYCLE: numberString,
    PRICE_IN_USD: boolString,
    FIXED_PRICE: numberString,
    USD_PRICE: numberString,
    PLAN_ID: numberString,
    METRICS_PORT: numberString.optional(),
    LOKI_URL: z.string().optional(),
  });

  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Invalid environment variables: ${issues}`);
  }
}

if (require.main === module) {
  try {
    checkEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
