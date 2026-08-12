import type { GraphQLFormattedError } from 'graphql';
import type { NormalizedErrorCode } from '@nx-generators/shared-types';
import { AppError } from './app-error.js';

/**
 * Wired as Apollo Server's `formatError` option. Normalizes whatever a
 * resolver threw — an `AppError` from `validation/`, or anything
 * unexpected — into the `{code, fieldErrors}` extensions shape
 * `libs/graphql-client`'s errorLink expects on the client, so a rejected
 * input reads identically on both sides of the wire.
 */
export function formatError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapOriginalError(error);

  if (original instanceof AppError) {
    return {
      ...formattedError,
      message: original.message,
      extensions: {
        ...formattedError.extensions,
        code: original.code,
        ...(original.fieldErrors ? { fieldErrors: original.fieldErrors } : {}),
      },
    };
  }

  const existingCode = formattedError.extensions?.['code'];
  const code: NormalizedErrorCode | string =
    typeof existingCode === 'string' ? existingCode : 'INTERNAL_ERROR';
  return {
    ...formattedError,
    extensions: {
      ...formattedError.extensions,
      code,
    },
  };
}

function unwrapOriginalError(error: unknown): unknown {
  if (error && typeof error === 'object' && 'originalError' in error) {
    return (error as { originalError?: unknown }).originalError ?? error;
  }
  return error;
}
