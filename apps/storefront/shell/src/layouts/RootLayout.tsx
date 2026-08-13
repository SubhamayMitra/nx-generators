import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
import { Header } from '@nx-generators/shared-ui';
import { ErrorBoundary } from './ErrorBoundary';
import { apolloClient } from '../services/apollo-client';
import '../styles/main.scss';

/**
 * Wraps every route: persistent chrome, an <Outlet/> for the active route's
 * content, and provider composition (Apollo provider, error boundary,
 * suspense boundary for lazily-loaded MFE remotes). If this shell adopts a
 * shared state library, wrap its provider here too.
 */
export function RootLayout() {
  return (
    // apolloClient's type comes through libs/graphql-client's dev-mode
    // source resolution, which Apollo Client v4's split CJS/ESM type trees
    // sometimes resolve as structurally-identical-but-nominally-distinct
    // from what ApolloProvider expects here — a known cross-package TS
    // resolution quirk, not a real type error (doesn't affect runtime;
    // rspack's swc-loader doesn't type-check).
    <ApolloProvider
      client={apolloClient as unknown as ApolloProvider.Props['client']}
    >
      <ErrorBoundary
        fallback={(error) => (
          <p role="alert">Something went wrong: {error.message}</p>
        )}
      >
        <Header productName="Storefront" navLinks={[]} />
        <Suspense fallback={<p>Loading…</p>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </ApolloProvider>
  );
}
