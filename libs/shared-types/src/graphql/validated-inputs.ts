/**
 * Re-exports of the `z.infer` types Zod derives from
 * `libs/shared-validation`'s schemas, so consumers that only need the
 * TypeScript type (not the runtime schema) can depend on `shared-types`
 * alone. `shared-validation` is upstream here — its schemas are the
 * source of truth these types are inferred from.
 */
export type {
  SaveSearchInput,
  SearchQueryInput,
  UserInput,
} from '@nx-generators/shared-validation';
