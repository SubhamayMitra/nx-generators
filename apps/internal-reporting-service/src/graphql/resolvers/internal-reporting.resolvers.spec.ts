import { resolvers } from './internal-reporting.resolvers';
import { AppError } from '@nx-generators/graphql-service-core';

describe('internal-reporting resolvers', () => {
  it('health returns ok', () => {
    expect(resolvers.Query.health()).toBe('ok');
  });

  it('rejects an invalid input with a VALIDATION_ERROR AppError', async () => {
    await expect(
      resolvers.Mutation.createUser(undefined, {
        input: { name: '', email: 'not-an-email' },
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<AppError>);
  });
});
