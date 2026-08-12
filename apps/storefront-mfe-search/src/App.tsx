import { Suspense } from 'react';
import { useRoutes } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from './services/apollo-client';
import { featureRoutes } from './app/routes';
import './styles/main.scss';

function AppRoutes() {
  return useRoutes(featureRoutes);
}

/**
 * Exposed via Module Federation as this MFE's federated component, and
 * also what `bootstrap.tsx` renders directly for standalone dev — same
 * component either way, so behavior can't drift between the two. The shell
 * supplies the ambient <Router> in production; `bootstrap.tsx` supplies
 * its own when this MFE runs alone.
 */
export function App() {
  return (
    <ApolloProvider
      client={apolloClient as unknown as ApolloProvider.Props['client']}
    >
      <Suspense fallback={<p>Loading…</p>}>
        <AppRoutes />
      </Suspense>
    </ApolloProvider>
  );
}

export default App;
