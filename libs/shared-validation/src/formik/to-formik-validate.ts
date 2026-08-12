import type { z } from 'zod';

type PathSegment = string | number;

function setAtPath(
  target: Record<string, unknown>,
  path: PathSegment[],
  value: string,
): void {
  let cursor = target;
  path.forEach((segment, index) => {
    const key = String(segment);
    if (index === path.length - 1) {
      if (!(key in cursor)) {
        cursor[key] = value;
      }
      return;
    }
    const next = cursor[key];
    if (typeof next !== 'object' || next === null) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  });
}

/**
 * Converts a Zod schema into the `validate` function shape Formik expects
 * (`values => errors`), so a form's validation logic is the same schema a
 * GraphQL resolver validates against — written once in `libs/shared-validation`,
 * not duplicated as a separate Formik `validationSchema`. Uses
 * `safeParseAsync` so schemas built with an async `superRefine` (see
 * `createUserInputSchema`) work the same way as purely synchronous ones.
 */
export function toFormikValidate<Schema extends z.ZodType>(schema: Schema) {
  return async (values: unknown): Promise<Record<string, unknown>> => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return {};
    }
    const errors: Record<string, unknown> = {};
    for (const issue of result.error.issues) {
      if (issue.path.length === 0) {
        continue;
      }
      setAtPath(errors, issue.path as PathSegment[], issue.message);
    }
    return errors;
  };
}
