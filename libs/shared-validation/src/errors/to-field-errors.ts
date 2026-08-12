import { z } from 'zod';

/**
 * Flattens a ZodError into `{ field: [messages] }`, the exact shape
 * `NormalizedError.fieldErrors` (in `libs/shared-types`) expects. GraphQL
 * resolvers use this in `validation/` before reaching business logic;
 * `libs/graphql-client`'s errorLink expects GraphQL error extensions to
 * carry this same shape, so a rejected input reads identically on both
 * sides of the wire.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
