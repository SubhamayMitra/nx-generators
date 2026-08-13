import {
  joinPathFragments,
  updateJson,
  readProjectConfiguration,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { applicationGenerator } from '@nx/node';
import { pickBackendPort } from './pick-service-port';

export type GatewayMode = 'none' | 'new' | 'existing';

export interface SubgraphEntry {
  name: string;
  url: string;
}

/**
 * Gateways are per-product (apps/<product>/gateway, project name
 * <product>-gateway) — there's no single global gateway a service can
 * silently join regardless of which product it belongs to. A service
 * generated without --product has no gateway to attach to at all.
 */
export function gatewayRoot(product: string): string {
  return `apps/${product}/gateway`;
}

export function gatewayExists(tree: Tree, product: string): boolean {
  const root = gatewayRoot(product);
  return (
    tree.exists(joinPathFragments(root, 'project.json')) ||
    tree.exists(joinPathFragments(root, 'package.json'))
  );
}

/** Auto-detect per spec: `existing` if this product's gateway is present, else `none` — federation is opt-in only, never automatic. */
export function resolveGatewayMode(
  tree: Tree,
  product: string | undefined,
  requested: GatewayMode | undefined,
): GatewayMode {
  // An explicit request always passes through as-is — even an invalid one
  // (e.g. --gateway=new with no --product) — so validateGatewayMode can
  // reject it with a clear, specific error instead of this function
  // silently downgrading it to 'none'.
  if (requested) {
    return requested;
  }
  if (!product) {
    return 'none';
  }
  return gatewayExists(tree, product) ? 'existing' : 'none';
}

export function validateGatewayMode(
  tree: Tree,
  product: string | undefined,
  mode: GatewayMode,
): void {
  if (mode === 'none') {
    return;
  }
  if (!product) {
    throw new Error(
      `--gateway=${mode} requires --product — a service with no product owner can't be federated. Pass --product=<product>, or use --gateway=none.`,
    );
  }
  const exists = gatewayExists(tree, product);
  if (mode === 'new' && exists) {
    throw new Error(
      `${gatewayRoot(product)} already exists. Use --gateway=existing to register this service in it instead.`,
    );
  }
  if (mode === 'existing' && !exists) {
    throw new Error(
      `No ${gatewayRoot(product)} found yet. Use --gateway=new to create it and register this service as its first subgraph.`,
    );
  }
}

/**
 * The idempotent registration algorithm: `new` scaffolds apps/<product>/gateway
 * and writes the single-entry subgraph list; `existing` appends to it
 * (no-op if this service is already registered, warns instead of
 * clobbering if it's registered under a different URL).
 */
export async function ensureGateway(
  tree: Tree,
  product: string | undefined,
  mode: GatewayMode,
  entry: SubgraphEntry,
): Promise<void> {
  if (mode === 'none') {
    return;
  }
  // validateGatewayMode already guarantees product is set whenever mode !== 'none'.
  const root = gatewayRoot(product as string);
  if (mode === 'new') {
    await scaffoldGateway(tree, product as string, root);
    writeSubgraphsJson(root, tree, { subgraphs: [entry] });
    return;
  }
  upsertSubgraphEntry(tree, root, entry);
}

function subgraphsJsonPath(root: string): string {
  return joinPathFragments(root, 'src/subgraphs.json');
}

function writeSubgraphsJson(
  root: string,
  tree: Tree,
  data: { subgraphs: SubgraphEntry[] },
): void {
  tree.write(subgraphsJsonPath(root), `${JSON.stringify(data, null, 2)}\n`);
}

function upsertSubgraphEntry(
  tree: Tree,
  root: string,
  entry: SubgraphEntry,
): void {
  const path = subgraphsJsonPath(root);
  const raw = tree.read(path, 'utf-8');
  const data: { subgraphs: SubgraphEntry[] } = raw
    ? JSON.parse(raw)
    : { subgraphs: [] };

  const existing = data.subgraphs.find((s) => s.name === entry.name);
  if (existing) {
    if (existing.url !== entry.url) {
      console.warn(
        `Warning: subgraph "${entry.name}" is already registered in ${path} with a different URL (${existing.url}). Leaving it as-is — edit the file by hand if you intended to change it.`,
      );
    }
    return; // idempotent no-op either way
  }

  data.subgraphs.push(entry);
  writeSubgraphsJson(root, tree, data);
}

async function scaffoldGateway(
  tree: Tree,
  product: string,
  root: string,
): Promise<void> {
  const projectName = `${product}-gateway`;
  const port = pickBackendPort(tree, 4000);

  await applicationGenerator(tree, {
    directory: root,
    name: projectName,
    bundler: 'esbuild',
    framework: 'none',
    unitTestRunner: 'jest',
    linter: 'eslint',
    e2eTestRunner: 'none',
    swcJest: true,
  } as Parameters<typeof applicationGenerator>[1]);

  tree.delete(joinPathFragments(root, 'src/main.ts'));

  // esbuild's bundle:false preserves the full source path under dist
  // (dist/apps/<product>/gateway/src/main.js, not dist/main.js) — the
  // asset's output path must mirror that nesting so subgraphs.ts's
  // readFileSync(__dirname, ...) finds it (same reasoning as
  // graphql-service's schema.graphql asset).
  const gatewayConfig = readProjectConfiguration(tree, projectName);
  const buildTarget = gatewayConfig.targets?.['build'];
  if (buildTarget) {
    buildTarget.options = {
      ...buildTarget.options,
      assets: [
        ...((buildTarget.options?.['assets'] as unknown[] | undefined) ?? []),
        {
          input: joinPathFragments(root, 'src'),
          glob: 'subgraphs.json',
          output: joinPathFragments(root, 'src'),
        },
      ],
    };
  }
  gatewayConfig.tags = [
    ...new Set([...(gatewayConfig.tags ?? []), 'type:service']),
  ];
  updateProjectConfiguration(tree, projectName, gatewayConfig);

  tree.write(
    joinPathFragments(root, 'src/subgraphs.json'),
    `${JSON.stringify({ subgraphs: [] }, null, 2)}\n`,
  );

  tree.write(
    joinPathFragments(root, 'src/subgraphs.ts'),
    `import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface SubgraphsFile {
  subgraphs: Array<{ name: string; url: string }>;
}

// Read via fs rather than a TS JSON import — matches the pattern each
// graphql-service uses for its schema.graphql, and sidesteps a composite
// TS project-references quirk (TS6307) that a plain JSON import into an
// esbuild-bundled app tripped here.
const subgraphsData = JSON.parse(readFileSync(join(__dirname, 'subgraphs.json'), 'utf-8')) as SubgraphsFile;

/**
 * Wraps the generator-managed subgraphs.json (the mutation target
 * \`nx g graphql-service\` edits) with env-var overrides, so the same
 * "runtime-swappable without rebuild" property the shell's MFE remotes get
 * also applies to the gateway's own subgraph URLs. subgraphs.json itself
 * stays the pure data file — never hand-edit the URLs here, edit the env
 * var or subgraphs.json instead.
 */
export const subgraphs = subgraphsData.subgraphs.map((entry) => ({
  ...entry,
  url: process.env[envVarFor(entry.name)] ?? entry.url,
}));

function envVarFor(subgraphName: string): string {
  return \`\${subgraphName.toUpperCase().replace(/-/g, '_')}_SERVICE_URL\`;
}
`,
  );

  tree.write(
    joinPathFragments(root, 'src/main.ts'),
    `import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { subgraphs } from './subgraphs';

async function main() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({ subgraphs }),
  });

  const server = new ApolloServer({ gateway });
  const port = Number(process.env['PORT'] ?? ${port});
  const { url } = await startStandaloneServer(server, { listen: { port } });
  console.log(\`${product} gateway ready at \${url} — composing \${subgraphs.length} subgraph(s): \${subgraphs.map((s) => s.name).join(', ') || '(none yet)'}\`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
`,
  );

  tree.delete(joinPathFragments(root, 'src/main.spec.ts'));
  tree.write(
    joinPathFragments(root, 'src/subgraphs.spec.ts'),
    `import { subgraphs } from './subgraphs';

describe('subgraphs', () => {
  it('is derived from subgraphs.json, applying env overrides by convention', () => {
    expect(Array.isArray(subgraphs)).toBe(true);
  });
});
`,
  );

  const packageJsonPath = joinPathFragments(root, 'package.json');
  if (tree.exists(packageJsonPath)) {
    updateJson(tree, packageJsonPath, (json) => {
      json.dependencies = {
        ...json.dependencies,
        '@apollo/server': '^5.5.1',
        '@apollo/gateway': '^2.14.3',
        graphql: '^17.0.2',
      };
      return json;
    });
  }

  tree.write(
    joinPathFragments(root, 'README.md'),
    `# ${projectName}

The Apollo Federation Gateway for the **${product}** product, created
automatically the first time one of ${product}'s GraphQL services is
generated with \`--product=${product} --gateway=new\`.

Composes every registered subgraph (see \`src/subgraphs.json\`, edited by
\`nx g graphql-service ... --product=${product} --gateway=new|existing\` —
never by hand) into one supergraph via \`IntrospectAndCompose\`. Each
subgraph's URL can be overridden at runtime via \`<SUBGRAPH_NAME>_SERVICE_URL\`
env vars without a rebuild — see \`src/subgraphs.ts\`.

Scoped to this product only — a service belonging to a different product
has its own separate gateway, never this one.

\`nx serve ${projectName}\`
`,
  );
}
