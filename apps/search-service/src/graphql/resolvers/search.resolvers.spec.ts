import { resolvers } from './search.resolvers';
import { AppError } from '@nx-generators/graphql-service-core';

describe('search resolvers', () => {
  it('health returns ok', () => {
    expect(resolvers.Query.searchHealth()).toBe('ok');
  });

  it('rejects an invalid input with a VALIDATION_ERROR AppError', async () => {
    await expect(
      resolvers.Mutation.createSearchUser(undefined, {
        input: { name: '', email: 'not-an-email' },
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<AppError>);
  });
});
