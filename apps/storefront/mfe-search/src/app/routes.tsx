import type { RouteObject } from 'react-router';
import { SavedSearches } from '../features/saved-searches/SavedSearches';

// Appended to by `nx g feature storefront-mfe-search <feature-name>` — one
// entry per feature. Left with a placeholder here; a freshly generated MFE
// has no features yet.
export const featureRoutes: RouteObject[] = [
  {
    index: true,
    element: <p>No features yet — run `nx g feature` to add one.</p>,
  },

  { path: 'saved-searches', element: <SavedSearches /> },
];
