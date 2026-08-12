import {
  formatFiles,
  joinPathFragments,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { appendArrayEntry } from '../../utils/append-array-entry';
import type { FeatureGeneratorSchema } from './schema';

type MfeState = 'rtk' | 'zustand' | 'react-query' | 'none';

export async function featureGenerator(
  tree: Tree,
  options: FeatureGeneratorSchema,
) {
  const projectRoot = `apps/${options.mfeName}`;
  if (!tree.exists(joinPathFragments(projectRoot, 'project.json'))) {
    throw new Error(
      `No MFE named "${options.mfeName}" found at ${projectRoot}. Run \`nx g mfe <shell> <name>\` first.`,
    );
  }

  const config = readProjectConfiguration(tree, options.mfeName);
  const state =
    ((config.metadata as Record<string, unknown> | undefined)?.['mfeState'] as
      MfeState | undefined) ?? 'none';

  const pascal = toPascalCase(options.name);
  const camel = toCamelCase(options.name);
  const featureRoot = joinPathFragments(
    projectRoot,
    'src/features',
    options.name,
  );

  writeComponent(tree, featureRoot, pascal, camel);
  writeHook(tree, featureRoot, pascal, camel, state);
  writeService(tree, featureRoot, camel, pascal);
  writeStateSlice(
    tree,
    projectRoot,
    featureRoot,
    options.name,
    camel,
    pascal,
    state,
  );
  writeTests(tree, featureRoot, pascal, camel);
  registerFeatureRoute(tree, projectRoot, options.name, pascal);

  await formatFiles(tree);
}

function writeComponent(
  tree: Tree,
  featureRoot: string,
  pascal: string,
  camel: string,
): void {
  tree.write(
    joinPathFragments(featureRoot, `${pascal}.tsx`),
    `import { use${pascal} } from './use${pascal}';

export function ${pascal}() {
  const { ${camel} } = use${pascal}();

  return (
    <section>
      <h2>${humanize(pascal)}</h2>
      <p>{${camel}.status}</p>
    </section>
  );
}

export default ${pascal};
`,
  );
}

function writeHook(
  tree: Tree,
  featureRoot: string,
  pascal: string,
  camel: string,
  state: MfeState,
): void {
  if (state === 'rtk') {
    tree.write(
      joinPathFragments(featureRoot, `use${pascal}.ts`),
      `import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store/store';
import { ${camel}Requested } from './${camel}.slice';
import { fetch${pascal} } from './${camel}.service';

export function use${pascal}() {
  const dispatch = useDispatch();
  const ${camel} = useSelector((state: RootState) => state.${camel});

  async function load() {
    dispatch(${camel}Requested());
    const result = await fetch${pascal}();
    return result;
  }

  return { ${camel}, load };
}
`,
    );
    return;
  }

  if (state === 'zustand') {
    tree.write(
      joinPathFragments(featureRoot, `use${pascal}.ts`),
      `import { use${pascal}Store } from './${camel}.store';
import { fetch${pascal} } from './${camel}.service';

export function use${pascal}() {
  const ${camel} = use${pascal}Store();

  async function load() {
    ${camel}.setStatus('loading');
    const result = await fetch${pascal}();
    ${camel}.setStatus('loaded');
    return result;
  }

  return { ${camel}, load };
}
`,
    );
    return;
  }

  if (state === 'react-query') {
    tree.write(
      joinPathFragments(featureRoot, `use${pascal}.ts`),
      `import { useQuery } from '@tanstack/react-query';
import { ${camel}QueryKeys } from '../../services/query-client';
import { fetch${pascal} } from './${camel}.service';

export function use${pascal}() {
  const query = useQuery({ queryKey: ${camel}QueryKeys.lists(), queryFn: fetch${pascal} });
  const ${camel} = { status: query.isLoading ? 'loading' : query.isError ? 'error' : 'loaded', data: query.data };

  return { ${camel} };
}
`,
    );
    return;
  }

  tree.write(
    joinPathFragments(featureRoot, `use${pascal}.ts`),
    `import { useState, useCallback } from 'react';
import { fetch${pascal} } from './${camel}.service';

export function use${pascal}() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await fetch${pascal}();
      setStatus('loaded');
      return result;
    } catch {
      setStatus('error');
      return undefined;
    }
  }, []);

  return { ${camel}: { status }, load };
}
`,
  );
}

function writeService(
  tree: Tree,
  featureRoot: string,
  camel: string,
  pascal: string,
): void {
  tree.write(
    joinPathFragments(featureRoot, `${camel}.service.ts`),
    `import { gql } from '@apollo/client';
import { apolloClient } from '../../services/apollo-client';

// TODO: replace with a real query once this feature has a GraphQL operation
// to call — generated purely as a structural placeholder so \`${pascal}\`
// has somewhere real to call through, per this workspace's service-layer
// convention (components call services/, not inline useQuery + gql).
const ${pascal.toUpperCase()}_PLACEHOLDER_QUERY = gql\`
  query ${pascal}Placeholder {
    __typename
  }
\`;

export async function fetch${pascal}() {
  return apolloClient.query({ query: ${pascal.toUpperCase()}_PLACEHOLDER_QUERY });
}
`,
  );
}

function writeStateSlice(
  tree: Tree,
  projectRoot: string,
  featureRoot: string,
  featureName: string,
  camel: string,
  pascal: string,
  state: MfeState,
): void {
  if (state === 'rtk') {
    tree.write(
      joinPathFragments(featureRoot, `${camel}.slice.ts`),
      `import { createSlice } from '@reduxjs/toolkit';

export interface ${pascal}State {
  status: 'idle' | 'loading' | 'loaded' | 'error';
}

const initialState: ${pascal}State = { status: 'idle' };

export const ${camel}Slice = createSlice({
  name: '${camel}',
  initialState,
  reducers: {
    ${camel}Requested: (state) => {
      state.status = 'loading';
    },
  },
});

export const { ${camel}Requested } = ${camel}Slice.actions;
`,
    );
    registerReducer(
      tree,
      joinPathFragments(projectRoot, 'src/store/store.ts'),
      featureName,
      camel,
    );
    return;
  }

  if (state === 'zustand') {
    tree.write(
      joinPathFragments(featureRoot, `${camel}.store.ts`),
      `import { createScopedStore } from '@nx-generators/shared-state';

export interface ${pascal}State {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  setStatus: (status: ${pascal}State['status']) => void;
}

export const use${pascal}Store = createScopedStore<${pascal}State>(
  (set) => ({
    status: 'idle',
    setStatus: (status) => set({ status }),
  }),
  { name: '${camel}' },
);
`,
    );
  }
  // react-query and none: no dedicated state file — react-query's cache
  // (already namespaced per-MFE via query-client.ts) and plain useState are
  // the "state" for those options respectively.
}

/** Adds `<featureName>: <camel>Slice.reducer` to the MFE's root reducer map — every feature owns and registers its own slice. */
function registerReducer(
  tree: Tree,
  storeTsPath: string,
  featureName: string,
  camel: string,
): void {
  const content = tree.read(storeTsPath, 'utf-8');
  if (content === null) {
    return;
  }
  if (content.includes(`${camel}: ${camel}Slice.reducer`)) {
    return; // idempotent
  }

  const importLine = `import { ${camel}Slice } from '../features/${featureName}/${camel}.slice';\n`;
  const withImport = content.includes(importLine)
    ? content
    : importLine + content;

  const updated = withImport.replace(
    /reducer: \{([^}]*)\}/,
    (_match, body: string) => {
      const trimmed = body.trim();
      const separator =
        trimmed.length > 0 && !trimmed.endsWith(',') ? ', ' : '';
      return `reducer: { ${trimmed}${separator}${camel}: ${camel}Slice.reducer }`;
    },
  );

  tree.write(storeTsPath, updated);
}

function writeTests(
  tree: Tree,
  featureRoot: string,
  pascal: string,
  camel: string,
): void {
  tree.write(
    joinPathFragments(featureRoot, `${pascal}.spec.tsx`),
    `import { render, screen } from '@testing-library/react';
import { ${pascal} } from './${pascal}';

describe('${pascal}', () => {
  it('renders', () => {
    render(<${pascal} />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
`,
  );

  tree.write(
    joinPathFragments(featureRoot, `use${pascal}.spec.ts`),
    `import { renderHook } from '@testing-library/react';
import { use${pascal} } from './use${pascal}';

describe('use${pascal}', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => use${pascal}());
    expect(result.current.${camel}.status).toBe('idle');
  });
});
`,
  );
}

/** Inserts a route into the MFE's own internal route list — never the shell's, never bundler config. */
function registerFeatureRoute(
  tree: Tree,
  projectRoot: string,
  featureName: string,
  pascal: string,
): void {
  const routesPath = joinPathFragments(projectRoot, 'src/app/routes.tsx');
  let content = tree.read(routesPath, 'utf-8');
  if (content === null) {
    return;
  }
  if (content.includes(`from '../features/${featureName}/${pascal}'`)) {
    return; // idempotent
  }

  content = content.replace(
    "import type { RouteObject } from 'react-router';",
    `import type { RouteObject } from 'react-router';\nimport { ${pascal} } from '../features/${featureName}/${pascal}';`,
  );
  tree.write(routesPath, content);

  // Relative path (no leading slash): featureRoutes is used both by
  // bootstrap.tsx directly (standalone dev, mounted at the URL root) and
  // by the shell's `/${appName}/*` wildcard route (federated, mounted at a
  // sub-path) — see App.tsx's useRoutes() call. An absolute path would only
  // ever match the standalone case, leaving this feature unreachable (blank
  // page, no matching route) once the MFE is embedded in a shell.
  appendArrayEntry(tree, {
    filePath: routesPath,
    arrayStart: /export const featureRoutes: RouteObject\[\] = \[/,
    entryText: `{ path: '${featureName}', element: <${pascal} /> }`,
    alreadyPresent: (c: string) => c.includes(`path: '${featureName}'`),
  });
}

function toPascalCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function humanize(pascal: string): string {
  return pascal.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export default featureGenerator;
