import { GraphQLError } from 'graphql';
import { formatError } from './format-error.js';
import { AppError } from './app-error.js';

describe('formatError', () => {
  it('carries an AppError code and fieldErrors onto extensions', () => {
    const appError = new AppError(
      'VALIDATION_ERROR',
      'Give this search a name',
      {
        name: ['Give this search a name'],
      },
    );
    const graphQLError = new GraphQLError(appError.message, {
      originalError: appError,
    });

    const result = formatError(graphQLError.toJSON(), graphQLError);

    expect(result.extensions).toEqual({
      code: 'VALIDATION_ERROR',
      fieldErrors: { name: ['Give this search a name'] },
    });
    expect(result.message).toBe('Give this search a name');
  });

  it('defaults to INTERNAL_ERROR for an unexpected error', () => {
    const graphQLError = new GraphQLError('boom', {
      originalError: new Error('boom'),
    });

    const result = formatError(graphQLError.toJSON(), graphQLError);

    expect(result.extensions?.['code']).toBe('INTERNAL_ERROR');
  });
});
