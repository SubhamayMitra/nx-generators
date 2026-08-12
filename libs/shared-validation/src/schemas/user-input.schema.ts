import { z } from 'zod';

/**
 * Base sync schema — safe to use as-is anywhere only synchronous validation
 * is needed (e.g. as a Formik `validationSchema` with no async checks).
 */
export const userInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.email('Enter a valid email address'),
});

export type UserInput = z.infer<typeof userInputSchema>;

export interface CreateUserInputSchemaDeps {
  /** Resolves true if an account already exists for this email. */
  isEmailRegistered: (email: string) => Promise<boolean>;
}

/**
 * Custom-validator escape hatch: composes the base Zod schema with an
 * async `superRefine` check that can't be expressed as a pure sync Zod
 * rule (it needs to call out to a data source). The check itself
 * (`isEmailRegistered`) is injected rather than hardcoded, so the React
 * form can wire it to a debounced GraphQL query while a resolver wires it
 * directly to the database — both cases share the exact same schema shape
 * and error message, only the check's implementation differs.
 */
export function createUserInputSchema({
  isEmailRegistered,
}: CreateUserInputSchemaDeps) {
  return userInputSchema.superRefine(async (value, ctx) => {
    if (await isEmailRegistered(value.email)) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'An account with this email already exists',
      });
    }
  });
}
