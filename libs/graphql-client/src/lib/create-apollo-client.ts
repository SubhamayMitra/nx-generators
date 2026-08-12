import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
} from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';
import { SetContextLink } from '@apollo/client/link/context';
import type {
  NormalizedError,
  NormalizedErrorCode,
} from '@nx-generators/shared-types';

export interface CreateApolloClientConfig {
  /** The GraphQL endpoint this app talks to — its own service, or a federated gateway. */
  uri: string;
  /** Reads the current auth token from wherever this app keeps it (cookie, memory, a shared-state store, …). */
  getAuthToken?: () => string | null | undefined;
  /**
   * Called whenever a request fails, with the error normalized into the
   * same `NormalizedError` shape `libs/graphql-service-core` produces
   * server-side, so the UI renders GraphQL errors and validation failures
   * identically regardless of which service raised them.
   */
  onNormalizedError?: (error: NormalizedError) => void;
}

export function toNormalizedError(error: unknown): NormalizedError {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const extensions = (first?.extensions ?? {}) as {
      code?: NormalizedErrorCode;
      fieldErrors?: Record<string, string[]>;
    };
    return {
      code: extensions.code ?? 'INTERNAL_ERROR',
      message: first?.message ?? error.message,
      fieldErrors: extensions.fieldErrors,
    };
  }
  if (CombinedProtocolErrors.is(error)) {
    return { code: 'INTERNAL_ERROR', message: error.message };
  }
  return {
    code: 'NETWORK_ERROR',
    message: error instanceof Error ? error.message : 'Network error',
  };
}

/**
 * Builds a fresh `ApolloClient` instance and cache. This is a factory, not
 * a shared singleton: every shell and every MFE calls this on its own,
 * so any MFE keeps working standalone (its own client, its own cache) and
 * no MFE's Apollo state leaks into another's. Do not "simplify" this into
 * one client the shell provides to every remote — that's a deliberate
 * non-goal of this workspace, not an oversight.
 */
export function createApolloClient({
  uri,
  getAuthToken,
  onNormalizedError,
}: CreateApolloClientConfig) {
  const httpLink = new HttpLink({ uri });

  const authLink = new SetContextLink((prevContext) => {
    const token = getAuthToken?.();
    if (!token) {
      return {};
    }
    return {
      headers: {
        ...(prevContext.headers as Record<string, string> | undefined),
        authorization: `Bearer ${token}`,
      },
    };
  });

  const errorLink = new ErrorLink(({ error }) => {
    onNormalizedError?.(toNormalizedError(error));
  });

  return new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
  });
}
