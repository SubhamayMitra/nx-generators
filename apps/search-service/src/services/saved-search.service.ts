import type { SaveSearchInput } from '@nx-generators/shared-validation';
import { prisma } from '../datasources/sql/prisma-client';

export async function createSavedSearch(input: SaveSearchInput) {
  return prisma.savedSearch.create({ data: input });
}
