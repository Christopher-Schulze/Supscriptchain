const path = require('path');
const { config } = require('dotenv');
const { z } = require('zod');

function check() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  config({ path: envPath });

  const schema = z.object({
    NEXT_PUBLIC_CONTRACT_ADDRESS: z.string().nonempty(),
    NEXT_PUBLIC_CHAIN_ID: z.coerce.number(),
    NEXT_PUBLIC_RPC_URL: z.string().url(),
    NEXT_PUBLIC_SUBGRAPH_URL: z.string().url(),
  });

  const optional = {
    NEXT_PUBLIC_REFRESH_INTERVAL: z.coerce.number(),
  };

  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Invalid environment variables: ${issues}`);
  }

  for (const [key, schema] of Object.entries(optional)) {
    const val = process.env[key];
    if (val) {
      const res = schema.safeParse(val);
      if (!res.success) {
        const issue = res.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join(', ');
        console.warn(`Warning: optional variable ${key} has invalid value: ${issue}`);
      }
    }
  }
}

// Validate the environment when called directly or via `npm run dev`
if (require.main === module || process.env.npm_lifecycle_event === 'dev') {
  try {
    check();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { check };
