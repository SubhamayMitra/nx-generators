import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { formatError } from '@nx-generators/graphql-service-core';
import { resolvers } from './graphql/resolvers/search.resolvers';
import { plugins } from './middleware';
import { createContext } from './context';

const typeDefs = parse(
  readFileSync(join(__dirname, 'graphql/schema/search.graphql'), 'utf-8'),
);
const schema = buildSubgraphSchema({ typeDefs, resolvers });

// plugins/formatError come from libs/graphql-service-core, resolved through
// this workspace's dev-mode source condition — @apollo/server's own
// internal CJS/ESM-split type declarations sometimes make that cross-package
// reference structurally-identical-but-nominally-distinct from what this
// file's own @apollo/server import expects (doesn't affect runtime).
const server = new ApolloServer({
  schema,
  plugins,
  formatError,
} as ConstructorParameters<typeof ApolloServer>[0]);

async function main() {
  const port = Number(process.env['PORT'] ?? 4001);
  const { url } = await startStandaloneServer(server, {
    context: createContext,
    listen: { port },
  });
  console.log(`search-service ready at ${url} (federated subgraph)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
