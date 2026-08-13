import { useFormik } from 'formik';
import {
  saveSearchInputSchema,
  toFormikValidate,
} from '@nx-generators/shared-validation';
import { saveSearch } from './savedSearches.service';

/**
 * The shared-validation end-to-end example: this Formik form validates
 * against the exact same `saveSearchInputSchema` (from
 * libs/shared-validation) that search-service's `saveSearch` resolver
 * validates against server-side — write once, validate on both sides.
 */
export function useSavedSearches() {
  return useFormik({
    initialValues: { name: '', query: '' },
    validate: toFormikValidate(saveSearchInputSchema),
    onSubmit: async (values, helpers) => {
      await saveSearch(values);
      helpers.resetForm();
    },
  });
}
