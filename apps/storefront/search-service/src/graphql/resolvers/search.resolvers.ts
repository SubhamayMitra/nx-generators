import {
  userInputSchema,
  saveSearchInputSchema,
} from '@nx-generators/shared-validation';
import { validateInput } from '../../validation/validate-input';
import { createUser } from '../../services/user.service';
import { createSavedSearch } from '../../services/saved-search.service';

/**
 * Resolvers stay thin — they validate at the boundary (see validation/) and
 * delegate everything else to services/, which owns the actual business
 * logic and datasource calls.
 */
export const resolvers = {
  Query: {
    searchHealth: (): string => 'ok',
  },
  Mutation: {
    createSearchUser: async (_parent: unknown, args: { input: unknown }) => {
      const input = validateInput(userInputSchema, args.input);
      return createUser(input);
    },
    // Validated against the exact same schema the saved-searches feature's
    // Formik form validates against client-side — see
    // libs/shared-validation's saveSearchInputSchema.
    saveSearch: async (_parent: unknown, args: { input: unknown }) => {
      const input = validateInput(saveSearchInputSchema, args.input);
      return createSavedSearch(input);
    },
  },
};
