import { saveSearchInputSchema } from './save-search.schema.js';
import { toFieldErrors } from '../errors/to-field-errors.js';

describe('saveSearchInputSchema', () => {
  it('accepts a valid saved search', () => {
    const result = saveSearchInputSchema.safeParse({
      name: 'Winter coats',
      query: 'coat',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name with a field-scoped error', () => {
    const result = saveSearchInputSchema.safeParse({ name: '', query: 'coat' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({
        name: ['Give this search a name'],
      });
    }
  });
});
