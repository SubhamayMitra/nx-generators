import { createApolloClient } from '@nx-generators/graphql-client';
import type { ApolloClient } from '@apollo/client';

/**
 * This shell's own Apollo Client instance — a factory call, not a shared
 * singleton import. Point `uri` at this shell's own GraphQL gateway/service
 * once it has shell-level queries; MFEs create their own separate instances.
 *
 * Explicitly typed: libs/graphql-client resolves through this workspace's
 * dev-mode source condition, and Apollo Client v4's split CJS/ESM type
 * trees make the inferred return type non-portable across that boundary
 * without an explicit annotation (doesn't affect runtime).
 */
export const apolloClient: ApolloClient = createApolloClient({
  uri: process.env['NX_PUBLIC_GRAPHQL_URI'] ?? 'http://localhost:4000/graphql',
}) as unknown as ApolloClient;
