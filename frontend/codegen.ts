import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: ['./lib/subgraph.ts'],
  config: {
    scalars: {
      BigInt: 'string',
      Bytes: 'string',
    },
  },
  generates: {
    './generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations'],
    },
  },
};

export default config;
