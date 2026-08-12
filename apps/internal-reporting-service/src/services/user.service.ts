import { randomUUID } from 'node:crypto';
import type { UserInput } from '@nx-generators/shared-types';
import { getUsersCollection } from '../datasources/nosql/mongo-client';

export async function createUser(input: UserInput) {
  const doc = { id: randomUUID(), ...input };
  const users = await getUsersCollection();
  await users.insertOne(doc);
  return doc;
}
