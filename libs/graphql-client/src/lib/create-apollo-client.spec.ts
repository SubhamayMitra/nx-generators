import { CombinedGraphQLErrors, CombinedProtocolErrors } from '@apollo/client';
import {
  createApolloClient,
  toNormalizedError,
} from './create-apollo-client.js';

describe('toNormalizedError', () => {
  it('reads code and fieldErrors off a GraphQL error extensions payload', () => {
    const graphQLError = new CombinedGraphQLErrors({
      data: null,
      errors: [
        {
          message: 'Give this search a name',
          extensions: {
            code: 'VALIDATION_ERROR',
            fieldErrors: { name: ['Give this search a name'] },
          },
        },
      ],
    });

    expect(toNormalizedError(graphQLError)).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Give this search a name',
      fieldErrors: { name: ['Give this search a name'] },
    });
  });

  it('falls back to INTERNAL_ERROR for a protocol error', () => {
    const protocolError = new CombinedProtocolErrors([
      { message: 'bad protocol message' },
    ]);
    expect(toNormalizedError(protocolError)).toEqual({
      code: 'INTERNAL_ERROR',
      message: protocolError.message,
    });
  });

  it('treats anything else as a network error', () => {
    expect(toNormalizedError(new Error('fetch failed'))).toEqual({
      code: 'NETWORK_ERROR',
      message: 'fetch failed',
    });
  });
});

describe('createApolloClient', () => {
  it('builds a distinct client + cache per call', () => {
    const clientA = createApolloClient({
      uri: 'http://localhost:4001/graphql',
    });
    const clientB = createApolloClient({
      uri: 'http://localhost:4001/graphql',
    });

    expect(clientA).not.toBe(clientB);
    expect(clientA.cache).not.toBe(clientB.cache);
  });
});
