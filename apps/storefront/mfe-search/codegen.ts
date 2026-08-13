import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CodegenConfig } from '@graphql-codegen/cli';

const rawSchema = readFileSync(
  join(__dirname, '../search-service/src/graphql/schema/search.graphql'),
  'utf-8',
);
// Strip the Apollo Federation `extend schema @link(...)` header before
// handing it to codegen's plain schema loader — it doesn't need to
// understand federation directives to generate operation types, and chokes
// on the bare `extend schema` with no base schema to extend in this
// standalone context ("Query root type must be provided").
const schemaForCodegen = rawSchema.replace(/^extend schema[\s\S]*?\n\n/, '');

/**
 * Generates typed GraphQL operations for this MFE from search-service's
 * own schema (read directly from its SDL file — no running server needed
 * for codegen). Talks to a federated gateway instead of a single service's
 * schema? Point this at the gateway's composed supergraph SDL instead once
 * this app moves off a single service.
 */
const config: CodegenConfig = {
  schema: schemaForCodegen,
  documents: 'src/services/**/*.graphql',
  generates: {
    'src/services/generated/graphql.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
    },
  },
};

export default config;
