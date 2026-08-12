import {
  formatFiles,
  joinPathFragments,
  updateJson,
  type Tree,
  type GeneratorCallback,
} from '@nx/devkit';
// host/remote (used for --bundler=webpack) are public @nx/react exports,
// but deprecated and slated for removal in Nx v24; kept here only because
// @nx/react:consumer/:provider (this workspace's default, non-deprecated MF
// generators) dropped webpack support entirely.
import { hostGenerator } from '@nx/react';
import { loadNxGenerator } from '../../utils/load-nx-generator';
import { resetArrayEntries } from '../../utils/append-array-entry';
import { patchAppTsconfig } from '../../utils/patch-app-tsconfig';
import { patchRspackConfigForWorkspace } from '../../utils/patch-rspack-config';
import { writeAppJestConfig } from '../../utils/write-app-jest-config';
import { pickAvailablePort } from '../../utils/pick-available-port';
import { addProjectTags } from '../../utils/add-project-tags';
import type { ShellGeneratorSchema } from './schema';

interface ConsumerGeneratorSchema {
  directory: string;
  bundler?: 'vite' | 'rsbuild' | 'rspack';
  port?: number;
  providerNames?: string[];
}

const consumerGenerator = loadNxGenerator<
  (tree: Tree, schema: ConsumerGeneratorSchema) => Promise<GeneratorCallback>
>('@nx/react', 'consumer');

export async function shellGenerator(
  tree: Tree,
  options: ShellGeneratorSchema,
) {
  const bundler = options.bundler ?? 'rspack';
  const projectName = `${options.name}-shell`;
  const projectRoot = `apps/${projectName}`;

  if (bundler === 'rspack') {
    // @nx/react:consumer always defaults to the same base port regardless of
    // how many shells/providers already exist in the workspace — it does no
    // collision detection. Pick a free one ourselves (see mfe.ts, which has
    // the identical issue for @nx/react:provider).
    const port = pickAvailablePort(tree, 8100);
    await consumerGenerator(tree, {
      directory: projectRoot,
      bundler: 'rspack',
      port,
    });
    scaffoldRspackShell(tree, projectRoot);
    writeAppLayer(tree, projectRoot, projectName);
    writeAppJestConfig(tree, projectRoot, projectName);
    writeSmokeTest(tree, projectRoot, projectName);
  } else {
    // Secondary path: @nx/react:consumer/:provider (this workspace's default,
    // non-deprecated MF generators) dropped webpack support entirely, so
    // webpack goes through Nx's deprecated host/remote generators instead.
    // Given rarer use, this path gets the MF shared-singleton config and the
    // runtime JSON manifest Nx already scaffolds, but not the full
    // RootLayout/data-router rewrite the rspack path gets — see this
    // project's README for what's identical vs. different.
    await hostGenerator(tree, {
      directory: projectRoot,
      bundler: 'webpack',
      dynamic: true,
      style: 'scss',
      unitTestRunner: 'jest',
      e2eTestRunner: 'none',
      linter: 'eslint',
    });
    scaffoldWebpackShell(tree, projectRoot);
  }

  patchIndexHtmlBaseHref(tree, projectRoot);
  patchAppTsconfig(tree, joinPathFragments(projectRoot, 'tsconfig.json'));
  addProjectTags(tree, projectName, ['type:shell']);
  addAppDependencies(tree, projectRoot, bundler);
  writeReadme(tree, projectRoot, projectName, bundler);

  await formatFiles(tree);
}

/** rspack path: strip the consumer generator's placeholder PROVIDERS entry and add our required MF shared singletons. */
function scaffoldRspackShell(tree: Tree, projectRoot: string): void {
  const mfPath = joinPathFragments(projectRoot, 'src/mf.ts');
  resetArrayEntries(tree, mfPath, /const PROVIDERS:[^=]*=\s*\[/);

  patchRspackConfigForWorkspace(
    tree,
    joinPathFragments(projectRoot, 'rspack.config.ts'),
    ['react-router', '@apollo/client', '@nx-generators/shared-ui'],
  );

  renameEntryToMain(
    tree,
    projectRoot,
    'rspack.config.ts',
    "entry: { main: './src/index.ts' }",
    "entry: { main: './src/main.tsx' }",
  );
}

/**
 * webpack path: Nx's classic host generator already scaffolds a runtime
 * JSON manifest (src/assets/module-federation.manifest.json, fetched by
 * src/main.ts via registerRemotes()) — no separate manifest file needed,
 * `mfe` appends directly into that JSON. We only need to add the extra MF
 * shared singletons Nx doesn't infer automatically.
 */
function scaffoldWebpackShell(tree: Tree, projectRoot: string): void {
  const mfConfigPath = joinPathFragments(
    projectRoot,
    'module-federation.config.ts',
  );
  const content = tree.read(mfConfigPath, 'utf-8');
  if (content?.includes('remotes: [],')) {
    tree.write(
      mfConfigPath,
      content.replace(
        'remotes: [],',
        "remotes: [],\n  additionalShared: ['react-router', '@apollo/client', '@nx-generators/shared-ui'],",
      ),
    );
  }

  // Nx's host generator still hardcodes react-router-dom (the deprecated
  // compat shim); swap to the bare `react-router` package this workspace
  // standardizes on everywhere else, so the MF shared-singleton name
  // actually matches what's imported.
  replaceInFile(
    tree,
    joinPathFragments(projectRoot, 'src/bootstrap.tsx'),
    'react-router-dom',
    'react-router',
  );
  replaceInFile(
    tree,
    joinPathFragments(projectRoot, 'src/app/app.tsx'),
    'react-router-dom',
    'react-router',
  );
  replaceInFile(
    tree,
    joinPathFragments(projectRoot, 'src/app/app.spec.tsx'),
    'react-router-dom',
    'react-router',
  );

  const stylesPath = joinPathFragments(projectRoot, 'src/styles.scss');
  if (tree.exists(stylesPath)) {
    tree.write(
      stylesPath,
      `@use '@nx-generators/shared-ui/tokens' as tokens;\n\nbody {\n  margin: 0;\n  font-family: tokens.font-family('base');\n  background-color: tokens.color('bg-subtle');\n  color: tokens.color('text');\n}\n`,
    );
  }
}

/**
 * Shells own the top-level `/${appName}/*` wildcard routes that MFEs get
 * mounted under, so a deep link straight to a nested route (e.g.
 * `/search/saved-searches`, or any browser refresh on one) is a full-page
 * GET that historyApiFallback answers with this same index.html. Without a
 * `<base href="/">`, the injected script/link tags' relative URLs resolve
 * against the CURRENT path instead of the origin root — the dev server then
 * 404s/503s on e.g. `/search/main.js`, the entry script never loads, and the
 * page silently stays blank.
 */
function patchIndexHtmlBaseHref(tree: Tree, projectRoot: string): void {
  const indexPath = joinPathFragments(projectRoot, 'index.html');
  const content = tree.read(indexPath, 'utf-8');
  if (content && !content.includes('<base ')) {
    tree.write(
      indexPath,
      content.replace('<head>', '<head>\n    <base href="/" />'),
    );
  }
}

function replaceInFile(
  tree: Tree,
  filePath: string,
  from: string,
  to: string,
): void {
  const content = tree.read(filePath, 'utf-8');
  if (content?.includes(from)) {
    tree.write(filePath, content.split(from).join(to));
  }
}

function renameEntryToMain(
  tree: Tree,
  projectRoot: string,
  configFile: string,
  from: string,
  to: string,
): void {
  const srcIndex = joinPathFragments(projectRoot, 'src/index.ts');
  const srcMain = joinPathFragments(projectRoot, 'src/main.tsx');
  if (tree.exists(srcIndex) && !tree.exists(srcMain)) {
    const content = tree.read(srcIndex, 'utf-8');
    if (content !== null) {
      tree.write(srcMain, content);
      tree.delete(srcIndex);
    }
  }
  const configPath = joinPathFragments(projectRoot, configFile);
  const content = tree.read(configPath, 'utf-8');
  if (content?.includes(from)) {
    tree.write(configPath, content.replace(from, to));
  }
}

function writeAppLayer(
  tree: Tree,
  projectRoot: string,
  projectName: string,
): void {
  tree.write(
    joinPathFragments(projectRoot, 'src/app/routes.tsx'),
    `import type { RouteObject } from 'react-router';

// Appended to by \`nx g mfe ${projectName.replace(/-shell$/, '')} <mfe-name>\` — one entry per
// registered MFE. Left empty here; a freshly generated shell has no MFEs yet.
export const mfeRoutes: RouteObject[] = [];
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/app/router.tsx'),
    `import { createBrowserRouter } from 'react-router';
import { RootLayout } from '../layouts/RootLayout';
import { mfeRoutes } from './routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <p>Nothing registered yet — run \`nx g mfe\` to add one.</p> },
      ...mfeRoutes,
    ],
  },
]);
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/layouts/ErrorBoundary.tsx'),
    `import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** React has no functional error-boundary API — this stays a class component. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/layouts/RootLayout.tsx'),
    `import { Suspense } from 'react';
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
    <ApolloProvider client={apolloClient as unknown as ApolloProvider.Props['client']}>
      <ErrorBoundary fallback={(error) => <p role="alert">Something went wrong: {error.message}</p>}>
        <Header productName="${humanize(projectName)}" navLinks={[]} />
        <Suspense fallback={<p>Loading…</p>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </ApolloProvider>
  );
}
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/services/apollo-client.ts'),
    `import { createApolloClient } from '@nx-generators/graphql-client';
import type { ApolloClient } from '@apollo/client';

/**
 * This shell's own Apollo Client instance — a factory call, not a shared
 * singleton import. Point \`uri\` at this shell's own GraphQL gateway/service
 * once it has shell-level queries; MFEs create their own separate instances.
 *
 * Explicitly typed: libs/graphql-client resolves through this workspace's
 * dev-mode source condition, and Apollo Client v4's split CJS/ESM type
 * trees make the inferred return type non-portable across that boundary
 * without an explicit annotation (doesn't affect runtime).
 */
export const apolloClient: ApolloClient = createApolloClient({
  uri: process.env['NX_PUBLIC_GRAPHQL_URI'] ?? 'http://localhost:4000/graphql',
}) as unknown as ApolloClient;
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/styles/main.scss'),
    `@use '@nx-generators/shared-ui/tokens' as tokens;

body {
  margin: 0;
  font-family: tokens.font-family('base');
  background-color: tokens.color('bg-subtle');
  color: tokens.color('text');
}
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/App.tsx'),
    `import { RouterProvider } from 'react-router';
import { router } from './app/router';

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
`,
  );
}

function addAppDependencies(
  tree: Tree,
  projectRoot: string,
  bundler: 'rspack' | 'webpack',
): void {
  const deps = {
    'react-router': '^7.18.2',
    '@apollo/client': '^4.2.11',
    '@nx-generators/shared-ui': '*',
    '@nx-generators/shared-types': '*',
    '@nx-generators/graphql-client': '*',
  };

  const packageJsonPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(packageJsonPath)) {
    updateJson(tree, packageJsonPath, (json) => {
      json.dependencies = { ...json.dependencies, ...deps };
      return json;
    });
    return;
  }

  // webpack path (nx:run-commands/executor apps) declares deps at the
  // workspace root instead of a per-project package.json. hostGenerator
  // also unconditionally adds react-router-dom there; drop it since this
  // workspace standardizes on bare react-router.
  if (bundler === 'webpack' && tree.exists('package.json')) {
    updateJson(tree, 'package.json', (json) => {
      json.dependencies = { ...json.dependencies, ...deps };
      if (json.dependencies) {
        delete json.dependencies['react-router-dom'];
      }
      return json;
    });
  }
}

function writeReadme(
  tree: Tree,
  projectRoot: string,
  projectName: string,
  bundler: 'rspack' | 'webpack',
): void {
  const webpackNote =
    bundler === 'webpack'
      ? `\n> This app uses Nx's legacy \`@nx/react:host\` generator (webpack Module\n> Federation dropped from the current, non-deprecated \`@nx/react:consumer\`\n> generator this workspace defaults to). It gets the same MF shared-singleton\n> config and runtime JSON manifest, but keeps Nx's classic \`<Routes>\`/\`<Route>\`\n> router instead of the data-router (\`createBrowserRouter\`) setup the rspack\n> path uses — restructure \`src/app/app.tsx\` by hand if you need parity.\n`
      : '';
  tree.write(
    joinPathFragments(projectRoot, 'README.md'),
    `# ${projectName}

A shell (host) application generated by \`nx g shell\`, bundled with ${bundler} Module Federation.
${webpackNote}
## Structure

\`\`\`
src/
  app/            # router.tsx (createBrowserRouter), routes.tsx (MFE route list — nx g mfe appends here)
  layouts/        # RootLayout (chrome + Outlet + providers), ErrorBoundary
  services/       # this shell's own Apollo Client instance
  styles/         # main.scss, imports shared-ui design tokens
  components/     # presentational components local to this shell (created on demand)
  features/       # not typically used by shells (see MFEs) — created on demand
  hooks/          # created on demand
  store/          # created on demand, if this shell adopts shared state
  types/          # created on demand
  utils/          # created on demand
  App.tsx         # renders <RouterProvider>
  main.tsx        # Module Federation entry indirection
  bootstrap.tsx   # actual render call
\`\`\`

## Adding an MFE

\`nx g mfe ${projectName.replace(/-shell$/, '')} <mfe-name>\` registers a new MFE into this shell's
\`src/mf.ts\` PROVIDERS list and \`src/app/routes.tsx\` — no other file in this
project needs to change by hand.

## Serving

\`nx serve ${projectName}\`
`,
  );
}

function writeSmokeTest(
  tree: Tree,
  projectRoot: string,
  projectName: string,
): void {
  tree.write(
    joinPathFragments(projectRoot, 'src/App.spec.tsx'),
    `import { render, screen } from '@testing-library/react';

// mf.ts's registerRemotes() runs as a module-load side effect that expects
// the Module Federation runtime instance the rspack plugin injects at
// bundle time — absent under plain Jest. Mocked here since this test
// exercises RootLayout/routing, not federation itself.
jest.mock('@module-federation/runtime', () => ({
  registerRemotes: jest.fn(),
  loadRemote: jest.fn(),
}));

import { App } from './App';

describe('App', () => {
  it('renders the shell chrome and the default route content', async () => {
    render(<App />);
    expect(await screen.findByText('${humanize(projectName)}')).toBeInTheDocument();
    expect(await screen.findByText(/Nothing registered yet/)).toBeInTheDocument();
  });
});
`,
  );
}

function humanize(projectName: string): string {
  const base = projectName.replace(/-shell$/, '');
  return base
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default shellGenerator;
