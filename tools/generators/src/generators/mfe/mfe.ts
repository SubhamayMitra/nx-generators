import * as path from 'node:path';
import {
  formatFiles,
  joinPathFragments,
  updateJson,
  readProjectConfiguration,
  updateProjectConfiguration,
  type Tree,
  type GeneratorCallback,
} from '@nx/devkit';
// remoteGenerator (webpack path) is a public @nx/react export but
// deprecated, slated for removal in Nx v24 — see shell.ts for why it's
// still used for --bundler=webpack.
import { remoteGenerator } from '@nx/react';
import { loadNxGenerator } from '../../utils/load-nx-generator';
import { appendArrayEntry } from '../../utils/append-array-entry';
import { patchAppTsconfig } from '../../utils/patch-app-tsconfig';
import { patchRspackConfigForWorkspace } from '../../utils/patch-rspack-config';
import { writeAppJestConfig } from '../../utils/write-app-jest-config';
import { pickAvailablePort } from '../../utils/pick-available-port';
import { addProjectTags } from '../../utils/add-project-tags';
import { relocateProject } from '../../utils/relocate-project';
import type { MfeGeneratorSchema } from './schema';

interface ProviderGeneratorSchema {
  directory: string;
  bundler?: 'vite' | 'rsbuild' | 'rspack';
  port?: number;
  exposeName?: string;
}

const providerGenerator = loadNxGenerator<
  (tree: Tree, schema: ProviderGeneratorSchema) => Promise<GeneratorCallback>
>('@nx/react', 'provider');

const EXPOSE_NAME = 'App';

export async function mfeGenerator(tree: Tree, options: MfeGeneratorSchema) {
  const shellProjectName = `${options.shellName}-shell`;
  let shellProjectRoot: string;
  try {
    shellProjectRoot = readProjectConfiguration(tree, shellProjectName).root;
  } catch {
    throw new Error(
      `No shell named "${shellProjectName}" found. Run \`nx g shell ${options.shellName}\` first.`,
    );
  }

  const shellUsesRspack = tree.exists(
    joinPathFragments(shellProjectRoot, 'src/mf.ts'),
  );
  const shellBundler: 'rspack' | 'webpack' = shellUsesRspack
    ? 'rspack'
    : 'webpack';
  const bundler = options.bundler ?? shellBundler;
  if (options.bundler && options.bundler !== shellBundler) {
    console.warn(
      `Warning: shell "${shellProjectName}" uses ${shellBundler}, but this MFE was generated with --bundler=${options.bundler}. Cross-bundler Module Federation runtime interop between rspack and webpack is not verified by this workspace — proceed with caution.`,
    );
  }

  const projectName = `${options.shellName}-mfe-${options.name}`;
  // Sibling of the shell's own directory within the same product folder,
  // e.g. apps/storefront/mfe-search alongside apps/storefront/shell.
  const productDir = path.posix.dirname(shellProjectRoot);
  const projectRoot = joinPathFragments(productDir, `mfe-${options.name}`);

  if (bundler === 'rspack') {
    // @nx/react:provider always defaults to the same base port regardless
    // of how many providers already exist in the workspace — it does no
    // collision detection. Pick a free one ourselves by scanning every
    // existing app's rspack.config.ts before generating.
    const port = pickAvailablePort(tree, 8101);
    // @nx/react:provider infers both the project name and the Module
    // Federation container name from --directory's trailing segment (no
    // separate `name` option) — generate under a directory whose trailing
    // segment already IS `projectName`, so both come out correctly (e.g.
    // NAME = storefront_mfe_search, not just mfe_search), then relocate to
    // the shorter final `projectRoot` below.
    const generateRoot = joinPathFragments(productDir, projectName);
    await providerGenerator(tree, {
      directory: generateRoot,
      bundler: 'rspack',
      exposeName: EXPOSE_NAME,
      port,
    });
    await relocateProject(tree, projectName, projectRoot);
    scaffoldRspackMfe(tree, projectRoot);
    writeAppLayer(tree, projectRoot, options);
    writeAppJestConfig(tree, projectRoot, projectName);
    writeSmokeTest(tree, projectRoot);
    const { federationName } = readRspackPortAndName(
      tree,
      joinPathFragments(projectRoot, 'rspack.config.ts'),
    );
    registerMfeInRspackShell(
      tree,
      shellProjectRoot,
      options.name,
      EXPOSE_NAME,
      port,
      federationName,
    );
  } else {
    // Unlike :provider, :remote accepts an explicit `name` distinct from
    // `directory`, so no relocate-after-generate dance is needed here.
    await remoteGenerator(tree, {
      directory: projectRoot,
      name: projectName,
      bundler: 'webpack',
      dynamic: true,
      style: 'scss',
      unitTestRunner: 'jest',
      e2eTestRunner: 'none',
      linter: 'eslint',
      skipFormat: true,
    });
    scaffoldWebpackMfe(tree, projectRoot);
    registerMfeInWebpackShell(
      tree,
      shellProjectRoot,
      projectName,
      options.name,
    );
  }

  patchAppTsconfig(tree, projectRoot);
  addProjectTags(tree, projectName, ['type:mfe']);
  addAppDependencies(tree, projectRoot, options.state ?? 'none');
  persistStateMetadata(tree, projectName, options.state ?? 'none');
  writeReadme(tree, projectRoot, projectName, shellProjectName, bundler);

  await formatFiles(tree);
}

function scaffoldRspackMfe(tree: Tree, projectRoot: string): void {
  patchRspackConfigForWorkspace(
    tree,
    joinPathFragments(projectRoot, 'rspack.config.ts'),
    ['react-router', '@apollo/client', '@nx-generators/shared-ui'],
  );
}

function scaffoldWebpackMfe(tree: Tree, projectRoot: string): void {
  const mfConfigPath = joinPathFragments(
    projectRoot,
    'module-federation.config.ts',
  );
  const content = tree.read(mfConfigPath, 'utf-8');
  if (content?.includes('exposes:')) {
    tree.write(
      mfConfigPath,
      content.replace(
        /exposes:\s*\{[^}]*\}/s,
        `exposes: {\n    './Module': './src/app/app.tsx',\n  },\n  additionalShared: ['react-router', '@apollo/client', '@nx-generators/shared-ui']`,
      ),
    );
  }
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
      `@use '@nx-generators/shared-ui/tokens' as tokens;\n\nbody {\n  margin: 0;\n  font-family: tokens.font-family('base');\n}\n`,
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

/**
 * Writes the standalone-testable app layer every MFE gets regardless of
 * bundler: its own internal route list (features register here — see the
 * `feature` generator), its own Apollo Client, and an exposed `App` that
 * owns both so it behaves identically whether a shell renders it or
 * `nx serve` runs it completely alone.
 */
function writeAppLayer(
  tree: Tree,
  projectRoot: string,
  options: MfeGeneratorSchema,
): void {
  tree.write(
    joinPathFragments(projectRoot, 'src/app/routes.tsx'),
    `import type { RouteObject } from 'react-router';

// Appended to by \`nx g feature ${options.shellName}-mfe-${options.name} <feature-name>\` — one
// entry per feature. Left with a placeholder here; a freshly generated MFE
// has no features yet.
export const featureRoutes: RouteObject[] = [
  { index: true, element: <p>No features yet — run \`nx g feature\` to add one.</p> },
];
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/services/apollo-client.ts'),
    `import { createApolloClient } from '@nx-generators/graphql-client';
import type { ApolloClient } from '@apollo/client';

/**
 * This MFE's own Apollo Client instance — a factory call, not a shared
 * singleton. Point \`uri\` at this MFE's own GraphQL service (or the
 * federated gateway) once one exists. Explicitly typed for the same reason
 * as the shell's equivalent file — see its comment for details.
 */
export const apolloClient: ApolloClient = createApolloClient({
  uri: process.env['NX_PUBLIC_GRAPHQL_URI'] ?? 'http://localhost:4000/graphql',
}) as unknown as ApolloClient;
`,
  );

  const state = options.state ?? 'none';
  const stateImports =
    state === 'rtk'
      ? `import { Provider } from 'react-redux';\nimport { store } from './store/store';\n`
      : state === 'react-query'
        ? `import { QueryClientProvider } from '@tanstack/react-query';\nimport { queryClient } from './services/query-client';\n`
        : '';
  const stateOpenTag =
    state === 'rtk'
      ? '<Provider store={store}>\n      '
      : state === 'react-query'
        ? '<QueryClientProvider client={queryClient}>\n      '
        : '';
  const stateCloseTag =
    state === 'rtk'
      ? '\n    </Provider>'
      : state === 'react-query'
        ? '\n    </QueryClientProvider>'
        : '';

  tree.write(
    joinPathFragments(projectRoot, 'src/App.tsx'),
    `import { Suspense } from 'react';
import { useRoutes } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
${stateImports}import { apolloClient } from './services/apollo-client';
import { featureRoutes } from './app/routes';
import './styles/main.scss';

function AppRoutes() {
  return useRoutes(featureRoutes);
}

/**
 * Exposed via Module Federation as this MFE's federated component, and
 * also what \`bootstrap.tsx\` renders directly for standalone dev — same
 * component either way, so behavior can't drift between the two. The shell
 * supplies the ambient <Router> in production; \`bootstrap.tsx\` supplies
 * its own when this MFE runs alone.
 */
export function App() {
  return (
    ${stateOpenTag}<ApolloProvider client={apolloClient as unknown as ApolloProvider.Props['client']}>
      <Suspense fallback={<p>Loading…</p>}>
        <AppRoutes />
      </Suspense>
    </ApolloProvider>${stateCloseTag}
  );
}

export default App;
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/bootstrap.tsx'),
    `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/styles/main.scss'),
    `@use '@nx-generators/shared-ui/tokens' as tokens;

body {
  margin: 0;
  font-family: tokens.font-family('base');
}
`,
  );

  writeStateLayer(tree, projectRoot, options.state ?? 'none', options.name);
}

function writeStateLayer(
  tree: Tree,
  projectRoot: string,
  state: NonNullable<MfeGeneratorSchema['state']>,
  mfeName: string,
): void {
  if (state === 'none') {
    return;
  }
  if (state === 'rtk') {
    tree.write(
      joinPathFragments(projectRoot, 'src/store/example.slice.ts'),
      `import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ExampleState {
  lastQuery: string | null;
}

const initialState: ExampleState = { lastQuery: null };

export const exampleSlice = createSlice({
  name: '${mfeName}/example',
  initialState,
  reducers: {
    queried: (state, action: PayloadAction<string>) => {
      state.lastQuery = action.payload;
    },
  },
});

export const { queried } = exampleSlice.actions;
`,
    );
    tree.write(
      joinPathFragments(projectRoot, 'src/store/store.ts'),
      `import { createAppStore } from '@nx-generators/shared-state';
import { exampleSlice } from './example.slice';

/**
 * This MFE's own store — feature slices this MFE owns, not a shell-composed
 * root reducer. Keeps this MFE independently deployable.
 */
export const store = createAppStore({ reducer: { example: exampleSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
`,
    );
  }
  if (state === 'zustand') {
    tree.write(
      joinPathFragments(projectRoot, 'src/store/useExampleStore.ts'),
      `import { createScopedStore } from '@nx-generators/shared-state';

interface ExampleState {
  lastQuery: string | null;
  setLastQuery: (query: string) => void;
}

export const useExampleStore = createScopedStore<ExampleState>(
  (set) => ({
    lastQuery: null,
    setLastQuery: (query) => set({ lastQuery: query }),
  }),
  { name: '${mfeName}-example' },
);
`,
    );
  }
  if (state === 'react-query') {
    tree.write(
      joinPathFragments(projectRoot, 'src/services/query-client.ts'),
      `import { createQueryClient, createQueryKeyFactory } from '@nx-generators/shared-state';

/** This MFE's own QueryClient — not shared with any other MFE. */
export const queryClient = createQueryClient();

/** Namespaces this MFE's query keys so they can never collide with another MFE's. */
export const ${camelCase(mfeName)}QueryKeys = createQueryKeyFactory('${mfeName}');
`,
    );
  }
}

/**
 * Reads the provider's own generated rspack.config.ts for its actual
 * auto-assigned dev-server port and federation container name — these
 * must match exactly what the shell registers, and both are Nx-assigned
 * (not something this generator should invent or recompute independently).
 */
function readRspackPortAndName(
  tree: Tree,
  rspackConfigPath: string,
): { port: number; federationName: string } {
  const content = tree.read(rspackConfigPath, 'utf-8') ?? '';
  const portMatch = /const PORT = (\d+);/.exec(content);
  const nameMatch = /const NAME = '([^']+)';/.exec(content);
  const port = portMatch?.[1];
  const federationName = nameMatch?.[1];
  if (!port || !federationName) {
    throw new Error(
      `Could not read PORT/NAME from ${rspackConfigPath} — has @nx/react:provider's generated config format changed?`,
    );
  }
  return { port: Number(port), federationName };
}

function registerMfeInRspackShell(
  tree: Tree,
  shellProjectRoot: string,
  mfeAlias: string,
  exposeName: string,
  port: number,
  federationName: string,
): void {
  const mfPath = joinPathFragments(shellProjectRoot, 'src/mf.ts');
  appendArrayEntry(tree, {
    filePath: mfPath,
    arrayStart: /const PROVIDERS:[^=]*=\s*\[/,
    entryText: `{ alias: '${mfeAlias}', name: '${federationName}', entry: 'http://localhost:${port}/remoteEntry.js' }`,
    alreadyPresent: (content: string) =>
      content.includes(`alias: '${mfeAlias}'`),
  });

  const routesPath = joinPathFragments(shellProjectRoot, 'src/app/routes.tsx');
  let content = tree.read(routesPath, 'utf-8');
  if (content === null) {
    return;
  }
  if (content.includes(`lazyProvider('${mfeAlias}',`)) {
    return; // already registered
  }

  const componentName = `${toPascalCase(mfeAlias)}Remote`;
  if (!content.includes('import { Suspense }')) {
    content = `import { Suspense } from 'react';\n${content}`;
  }
  if (!content.includes("from '../mf'")) {
    content = content.replace(
      "import type { RouteObject } from 'react-router';",
      "import type { RouteObject } from 'react-router';\nimport { lazyProvider } from '../mf';",
    );
  }
  content = content.replace(
    /export const mfeRoutes: RouteObject\[\] = \[/,
    `const ${componentName} = lazyProvider('${mfeAlias}', '${exposeName}');\n\nexport const mfeRoutes: RouteObject[] = [`,
  );
  tree.write(routesPath, content);

  appendArrayEntry(tree, {
    filePath: routesPath,
    arrayStart: /export const mfeRoutes: RouteObject\[\] = \[/,
    entryText: `{ path: '/${mfeAlias}/*', element: <Suspense fallback={<p>Loading…</p>}><${componentName} /></Suspense> }`,
    alreadyPresent: (c: string) => c.includes(`path: '/${mfeAlias}/*'`),
  });
}

function registerMfeInWebpackShell(
  tree: Tree,
  shellProjectRoot: string,
  mfeProjectName: string,
  mfeAlias: string,
): void {
  const manifestPath = joinPathFragments(
    shellProjectRoot,
    'src/assets/module-federation.manifest.json',
  );
  if (!tree.exists(manifestPath)) {
    return;
  }
  updateJson(tree, manifestPath, (json: Record<string, string>) => {
    json[mfeAlias] = `http://localhost:${derivePort(mfeAlias)}/remoteEntry.js`;
    return json;
  });
  console.warn(
    `Registered "${mfeAlias}" in ${shellProjectRoot}'s runtime manifest. This workspace's webpack path doesn't get the same route-list rewrite the rspack path does — wire a route to this remote by hand in ${shellProjectRoot}/src/app/app.tsx (federation container: ${mfeProjectName.replace(/-/g, '_')}).`,
  );
}

/** Deterministic-but-distinct dev port per MFE name, avoiding the shell's own 8100 and other MFEs. */
function derivePort(mfeAlias: string): number {
  let hash = 0;
  for (const char of mfeAlias) {
    hash = (hash * 31 + char.charCodeAt(0)) % 800;
  }
  return 8200 + hash;
}

function writeSmokeTest(tree: Tree, projectRoot: string): void {
  tree.write(
    joinPathFragments(projectRoot, 'src/App.spec.tsx'),
    `import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from './App';

describe('App', () => {
  it('renders standalone with its own router, layout, and Apollo Client', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No features yet/)).toBeInTheDocument();
  });
});
`,
  );
}

function toPascalCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function camelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function addAppDependencies(
  tree: Tree,
  projectRoot: string,
  state: NonNullable<MfeGeneratorSchema['state']>,
): void {
  const deps: Record<string, string> = {
    'react-router': '^7.18.2',
    '@apollo/client': '^4.2.11',
    '@nx-generators/shared-ui': '*',
    '@nx-generators/shared-types': '*',
    '@nx-generators/graphql-client': '*',
  };
  if (state !== 'none') {
    deps['@nx-generators/shared-state'] = '*';
  }
  if (state === 'rtk') {
    deps['@reduxjs/toolkit'] = '^2.12.0';
    deps['react-redux'] = '^9.3.0';
  }
  if (state === 'zustand') {
    deps['zustand'] = '^5.0.14';
  }
  if (state === 'react-query') {
    deps['@tanstack/react-query'] = '^5.101.4';
  }

  const packageJsonPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(packageJsonPath)) {
    updateJson(tree, packageJsonPath, (json) => {
      json.dependencies = { ...json.dependencies, ...deps };
      return json;
    });
    return;
  }
  if (tree.exists('package.json')) {
    updateJson(tree, 'package.json', (json) => {
      json.dependencies = { ...json.dependencies, ...deps };
      if (json.dependencies) {
        delete json.dependencies['react-router-dom'];
      }
      return json;
    });
  }
}

/** Persists this MFE's --state choice so `nx g feature` can generate a matching slice/store without re-accepting the flag. */
function persistStateMetadata(
  tree: Tree,
  projectName: string,
  state: string,
): void {
  const config = readProjectConfiguration(tree, projectName);
  updateProjectConfiguration(tree, projectName, {
    ...config,
    metadata: {
      ...(config.metadata as Record<string, unknown> | undefined),
      mfeState: state,
    },
  });
}

function writeReadme(
  tree: Tree,
  projectRoot: string,
  projectName: string,
  shellProjectName: string,
  bundler: 'rspack' | 'webpack',
): void {
  tree.write(
    joinPathFragments(projectRoot, 'README.md'),
    `# ${projectName}

A Module Federation MFE generated by \`nx g mfe\`, scoped to \`${shellProjectName}\`, bundled with ${bundler}.

## Standalone

\`nx serve ${projectName}\` runs this MFE completely on its own — its own
router (\`BrowserRouter\` in \`src/bootstrap.tsx\`), its own Apollo Client
(\`src/services/apollo-client.ts\`). No shell required.

## Adding a feature

\`nx g feature ${projectName} <feature-name>\` scaffolds into
\`src/features/<feature-name>/\` and registers a route in
\`src/app/routes.tsx\` — no bundler or shell config changes needed.
`,
  );
}

export default mfeGenerator;
