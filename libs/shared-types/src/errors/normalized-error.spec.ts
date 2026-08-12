import {
  saveSearchInputSchema,
  toFieldErrors,
} from '@nx-generators/shared-validation';
import type { NormalizedError } from './normalized-error.js';

describe('NormalizedError', () => {
  it('shape accepts fieldErrors produced by shared-validation for a rejected input', () => {
    const result = saveSearchInputSchema.safeParse({ name: '', query: '' });
    if (result.success) {
      throw new Error('expected validation failure');
    }
    const error: NormalizedError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      fieldErrors: toFieldErrors(result.error),
    };
    expect(error.fieldErrors).toEqual({
      name: ['Give this search a name'],
      query: ['Enter a search query first'],
    });
  });
});
