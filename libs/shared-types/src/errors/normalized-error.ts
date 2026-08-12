export type NormalizedErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

/**
 * The one error shape both sides of the wire agree on:
 * - GraphQL services put this on `error.extensions` (see
 *   `libs/graphql-service-core`'s error formatter and each service's
 *   `validation/` layer, which builds `fieldErrors` via
 *   `toFieldErrors()` from `libs/shared-validation`).
 * - `libs/graphql-client`'s errorLink reads `error.extensions` back into
 *   exactly this shape for the UI to render.
 * `fieldErrors` mirrors Zod's `flattenError().fieldErrors` structure
 * one-for-one, so a resolver's validation failure and the form's own
 * client-side validation failure render identically.
 */
export interface NormalizedError {
  code: NormalizedErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
