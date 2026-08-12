import { z } from 'zod';

/**
 * The single source of truth for "save a search" input, used by:
 * - the Formik form in the storefront-mfe-search "saved-searches" feature
 * - the `saveSearch` mutation resolver in search-service
 * Both sides import this schema directly so a bad input is rejected with
 * the exact same field errors on the client and the server.
 */
export const saveSearchInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give this search a name')
    .max(60, 'Keep the name under 60 characters'),
  query: z.string().trim().min(1, 'Enter a search query first'),
});

export type SaveSearchInput = z.infer<typeof saveSearchInputSchema>;
