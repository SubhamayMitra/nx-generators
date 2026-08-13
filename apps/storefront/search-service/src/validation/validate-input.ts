import type { z } from 'zod';
import { toFieldErrors } from '@nx-generators/shared-validation';
import { AppError } from '@nx-generators/graphql-service-core';

/**
 * Validates a resolver's input against a schema from libs/shared-validation
 * before it reaches services/ — the single point every mutation/query
 * input passes through, per this workspace's validation convention.
 * Throws an AppError whose `fieldErrors` land on the GraphQL response's
 * extensions in exactly the shape libs/graphql-client's errorLink expects.
 */
export function validateInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Invalid input',
      toFieldErrors(result.error),
    );
  }
  return result.data;
}
