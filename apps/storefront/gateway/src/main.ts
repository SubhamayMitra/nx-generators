import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { subgraphs } from './subgraphs';

async function main() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({ subgraphs }),
  });

  const server = new ApolloServer({ gateway });
  const port = Number(process.env['PORT'] ?? 4000);
  const { url } = await startStandaloneServer(server, { listen: { port } });
  console.log(
    `storefront gateway ready at ${url} — composing ${subgraphs.length} subgraph(s): ${subgraphs.map((s) => s.name).join(', ') || '(none yet)'}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
