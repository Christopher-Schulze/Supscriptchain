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
    check();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { check };
