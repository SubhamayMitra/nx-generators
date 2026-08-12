import type { RouteObject } from 'react-router';
import { CheckoutSummary } from '../features/checkout-summary/CheckoutSummary';

// Appended to by `nx g feature storefront-mfe-checkout <feature-name>` — one
// entry per feature. Left with a placeholder here; a freshly generated MFE
// has no features yet.
export const featureRoutes: RouteObject[] = [
  {
    index: true,
    element: <p>No features yet — run `nx g feature` to add one.</p>,
  },

  { path: '/checkout-summary', element: <CheckoutSummary /> },
];
