import { userInputSchema } from '@nx-generators/shared-validation';
import { validateInput } from '../../validation/validate-input';
import { createUser } from '../../services/user.service';

/**
 * Resolvers stay thin — they validate at the boundary (see validation/) and
 * delegate everything else to services/, which owns the actual business
 * logic and datasource calls.
 */
export const resolvers = {
  Query: {
    inventoryHealth: (): string => 'ok',
  },
  Mutation: {
    createInventoryUser: async (_parent: unknown, args: { input: unknown }) => {
      const input = validateInput(userInputSchema, args.input);
      return createUser(input);
    },
  },
};
