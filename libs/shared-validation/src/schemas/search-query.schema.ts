import { z } from 'zod';

export const searchQuerySchema = z.object({
  query: z.string().trim().min(1, 'Enter a search term'),
  limit: z.number().int().min(1).max(50).default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
