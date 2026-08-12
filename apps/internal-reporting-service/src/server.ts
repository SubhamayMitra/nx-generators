import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { formatError } from '@nx-generators/graphql-service-core';
import { resolvers } from './graphql/resolvers/internal-reporting.resolvers';
import { plugins } from './middleware';
import { createContext } from './context';

const typeDefs = readFileSync(
  join(__dirname, 'graphql/schema/internal-reporting.graphql'),
  'utf-8',
);

// See the federated server.ts variant's comment on this cast — same
// cross-package type-resolution quirk, not a real type error.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins,
  formatError,
} as ConstructorParameters<typeof ApolloServer>[0]);

async function main() {
  const port = Number(process.env['PORT'] ?? 4003);
  const { url } = await startStandaloneServer(server, {
    context: createContext,
    listen: { port },
  });
  console.log(`internal-reporting-service ready at ${url}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
