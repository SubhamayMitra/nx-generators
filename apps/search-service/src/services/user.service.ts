import type { UserInput } from '@nx-generators/shared-types';
import { prisma } from '../datasources/sql/prisma-client';

export async function createUser(input: UserInput) {
  return prisma.user.create({ data: input });
}
