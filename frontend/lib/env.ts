import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_CONTRACT_ADDRESS: z.string().nonempty(),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number(),
  NEXT_PUBLIC_RPC_URL: z.string().url(),
  NEXT_PUBLIC_SUBGRAPH_URL: z.string().url(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_SUBGRAPH_URL: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
});

export type Env = typeof env;
