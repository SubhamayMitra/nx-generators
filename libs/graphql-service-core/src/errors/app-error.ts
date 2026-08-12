import type { NormalizedErrorCode } from '@nx-generators/shared-types';

/**
 * Throw this from `services/` or `validation/` instead of a plain Error —
 * `formatError` (below) reads `code`/`fieldErrors` off it and puts them on
 * the GraphQL response's `extensions`, in the exact shape
 * `libs/graphql-client`'s errorLink expects to parse back into a
 * `NormalizedError` on the client.
 */
export class AppError extends Error {
  readonly code: NormalizedErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: NormalizedErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
