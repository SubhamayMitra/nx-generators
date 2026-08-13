import { createApolloClient } from '@nx-generators/graphql-client';
import type { ApolloClient } from '@apollo/client';

/**
 * This MFE's own Apollo Client instance — a factory call, not a shared
 * singleton. Point `uri` at this MFE's own GraphQL service (or the
 * federated gateway) once one exists. Explicitly typed for the same reason
 * as the shell's equivalent file — see its comment for details.
 */
export const apolloClient: ApolloClient = createApolloClient({
  uri: process.env['NX_PUBLIC_GRAPHQL_URI'] ?? 'http://localhost:4000/graphql',
}) as unknown as ApolloClient;
