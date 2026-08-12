import { Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { lazyProvider } from '../mf';

// Appended to by `nx g mfe checkout-portal <mfe-name>` — one entry per
// registered MFE. Left empty here; a freshly generated shell has no MFEs yet.
const ProfileRemote = lazyProvider('profile', 'App');

export const mfeRoutes: RouteObject[] = [
  {
    path: '/profile/*',
    element: (
      <Suspense fallback={<p>Loading…</p>}>
        <ProfileRemote />
      </Suspense>
    ),
  },
];
