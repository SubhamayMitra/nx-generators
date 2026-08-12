import { resolvers } from './inventory.resolvers';
import { AppError } from '@nx-generators/graphql-service-core';

describe('inventory resolvers', () => {
  it('health returns ok', () => {
    expect(resolvers.Query.inventoryHealth()).toBe('ok');
  });

  it('rejects an invalid input with a VALIDATION_ERROR AppError', async () => {
    await expect(
      resolvers.Mutation.createInventoryUser(undefined, {
        input: { name: '', email: 'not-an-email' },
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<AppError>);
  });
});
