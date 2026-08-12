import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

export interface CreateQueryClientOptions {
  queries?: DefaultOptions['queries'];
}

/**
 * Every MFE that picks React Query calls this to build its own QueryClient
 * (paired with `createQueryKeyFactory` for namespacing) instead of sharing
 * one client from the shell — same "own your data layer" principle as
 * `libs/graphql-client`'s Apollo Client factory.
 */
export function createQueryClient({ queries }: CreateQueryClientOptions = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
        ...queries,
      },
    },
  });
}
