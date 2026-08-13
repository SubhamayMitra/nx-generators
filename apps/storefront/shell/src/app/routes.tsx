import { Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { lazyProvider } from '../mf';

// Appended to by `nx g mfe storefront <mfe-name>` — one entry per
// registered MFE. Left empty here; a freshly generated shell has no MFEs yet.
const SearchRemote = lazyProvider('search', 'App');

const CheckoutRemote = lazyProvider('checkout', 'App');

export const mfeRoutes: RouteObject[] = [
  {
    path: '/search/*',
    element: (
      <Suspense fallback={<p>Loading…</p>}>
        <SearchRemote />
      </Suspense>
    ),
  },

  {
    path: '/checkout/*',
    element: (
      <Suspense fallback={<p>Loading…</p>}>
        <CheckoutRemote />
      </Suspense>
    ),
  },
];
