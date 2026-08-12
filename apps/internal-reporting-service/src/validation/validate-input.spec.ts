import { z } from 'zod';
import { validateInput } from './validate-input';
import { AppError } from '@nx-generators/graphql-service-core';

describe('validateInput', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('returns the parsed input on success', () => {
    expect(validateInput(schema, { name: 'Ada' })).toEqual({ name: 'Ada' });
  });

  it('throws an AppError with fieldErrors on failure', () => {
    try {
      validateInput(schema, { name: '' });
      throw new Error('expected validateInput to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).fieldErrors).toHaveProperty('name');
    }
  });
});
