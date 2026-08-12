import { toFormikValidate } from './to-formik-validate.js';
import { saveSearchInputSchema } from '../schemas/save-search.schema.js';
import { createUserInputSchema } from '../schemas/user-input.schema.js';

describe('toFormikValidate', () => {
  it('returns an empty object for valid values', async () => {
    const validate = toFormikValidate(saveSearchInputSchema);
    await expect(
      validate({ name: 'Winter coats', query: 'coat' }),
    ).resolves.toEqual({});
  });

  it('maps Zod issues onto matching form field keys', async () => {
    const validate = toFormikValidate(saveSearchInputSchema);
    await expect(validate({ name: '', query: '' })).resolves.toEqual({
      name: 'Give this search a name',
      query: 'Enter a search query first',
    });
  });

  it('awaits async superRefine checks (the custom-validator escape hatch)', async () => {
    const schema = createUserInputSchema({
      isEmailRegistered: async () => true,
    });
    const validate = toFormikValidate(schema);
    await expect(
      validate({ name: 'Ada', email: 'ada@example.com' }),
    ).resolves.toEqual({
      email: 'An account with this email already exists',
    });
  });
});
