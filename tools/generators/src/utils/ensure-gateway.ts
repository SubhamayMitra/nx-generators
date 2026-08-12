import {
  joinPathFragments,
  updateJson,
  readProjectConfiguration,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { applicationGenerator } from '@nx/node';

export type GatewayMode = 'none' | 'new' | 'existing';

export interface SubgraphEntry {
  name: string;
  url: string;
}

export const GATEWAY_ROOT = 'apps/gateway';

export function gatewayExists(tree: Tree): boolean {
  return (
    tree.exists(joinPathFragments(GATEWAY_ROOT, 'project.json')) ||
    tree.exists(joinPathFragments(GATEWAY_ROOT, 'package.json'))
  );
}

/** Auto-detect per spec: `existing` if a gateway is present, else `none` — federation is opt-in only, never automatic. */
export function resolveGatewayMode(
  tree: Tree,
  requested: GatewayMode | undefined,
): GatewayMode {
  return requested ?? (gatewayExists(tree) ? 'existing' : 'none');
}

export function validateGatewayMode(tree: Tree, mode: GatewayMode): void {
  const exists = gatewayExists(tree);
  if (mode === 'new' && exists) {
    throw new Error(
      'apps/gateway already exists. Use --gateway=existing to register this service in it instead.',
    );
  }
  if (mode === 'existing' && !exists) {
    throw new Error(
      'No apps/gateway found yet. Use --gateway=new to create it and register this service as its first subgraph.',
    );
  }
}

/**
 * The idempotent registration algorithm: `new` scaffolds apps/gateway and
 * writes the single-entry subgraph list; `existing` appends to it (no-op if
 * this service is already registered, warns instead of clobbering if it's
 * registered under a different URL).
 */
export async function ensureGateway(
  tree: Tree,
  mode: GatewayMode,
  entry: SubgraphEntry,
): Promise<void> {
  if (mode === 'none') {
    return;
  }
  if (mode === 'new') {
    await scaffoldGateway(tree);
    writeSubgraphsJson(tree, { subgraphs: [entry] });
    return;
  }
  upsertSubgraphEntry(tree, entry);
}

function subgraphsJsonPath(): string {
  return joinPathFragments(GATEWAY_ROOT, 'src/subgraphs.json');
}

function writeSubgraphsJson(
  tree: Tree,
  data: { subgraphs: SubgraphEntry[] },
): void {
  tree.write(subgraphsJsonPath(), `${JSON.stringify(data, null, 2)}\n`);
}

function upsertSubgraphEntry(tree: Tree, entry: SubgraphEntry): void {
  const path = subgraphsJsonPath();
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
  writeSubgraphsJson(tree, data);
}

async function scaffoldGateway(tree: Tree): Promise<void> {
  await applicationGenerator(tree, {
    directory: GATEWAY_ROOT,
    bundler: 'esbuild',
    framework: 'none',
    unitTestRunner: 'jest',
    linter: 'eslint',
    e2eTestRunner: 'none',
    swcJest: true,
  } as Parameters<typeof applicationGenerator>[1]);

  tree.delete(joinPathFragments(GATEWAY_ROOT, 'src/main.ts'));

  // esbuild's bundle:false preserves the full source path under dist
  // (dist/apps/gateway/src/main.js, not dist/main.js) — the asset's output
  // path must mirror that nesting so subgraphs.ts's readFileSync(__dirname, ...)
  // finds it (same reasoning as graphql-service's schema.graphql asset).
  const gatewayConfig = readProjectConfiguration(tree, 'gateway');
  const buildTarget = gatewayConfig.targets?.['build'];
  if (buildTarget) {
    buildTarget.options = {
      ...buildTarget.options,
      assets: [
        ...((buildTarget.options?.['assets'] as unknown[] | undefined) ?? []),
        {
          input: joinPathFragments(GATEWAY_ROOT, 'src'),
          glob: 'subgraphs.json',
          output: joinPathFragments(GATEWAY_ROOT, 'src'),
        },
      ],
    };
  }
  gatewayConfig.tags = [
    ...new Set([...(gatewayConfig.tags ?? []), 'type:service']),
  ];
  updateProjectConfiguration(tree, 'gateway', gatewayConfig);

  tree.write(
    joinPathFragments(GATEWAY_ROOT, 'src/subgraphs.json'),
    `${JSON.stringify({ subgraphs: [] }, null, 2)}\n`,
  );

  tree.write(
    joinPathFragments(GATEWAY_ROOT, 'src/subgraphs.ts'),
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
    joinPathFragments(GATEWAY_ROOT, 'src/main.ts'),
    `import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { subgraphs } from './subgraphs';

async function main() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({ subgraphs }),
  });

  const server = new ApolloServer({ gateway });
  const port = Number(process.env['PORT'] ?? 4000);
  const { url } = await startStandaloneServer(server, { listen: { port } });
  console.log(\`Gateway ready at \${url} — composing \${subgraphs.length} subgraph(s): \${subgraphs.map((s) => s.name).join(', ') || '(none yet)'}\`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
`,
  );

  tree.delete(joinPathFragments(GATEWAY_ROOT, 'src/main.spec.ts'));
  tree.write(
    joinPathFragments(GATEWAY_ROOT, 'src/subgraphs.spec.ts'),
    `import { subgraphs } from './subgraphs';

describe('subgraphs', () => {
  it('is derived from subgraphs.json, applying env overrides by convention', () => {
    expect(Array.isArray(subgraphs)).toBe(true);
  });
});
`,
  );

  const packageJsonPath = joinPathFragments(GATEWAY_ROOT, 'package.json');
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
    joinPathFragments(GATEWAY_ROOT, 'README.md'),
    `# gateway

The Apollo Federation Gateway, created automatically the first time a
GraphQL service is generated with \`--gateway=new\`.

Composes every registered subgraph (see \`src/subgraphs.json\`, edited by
\`nx g graphql-service ... --gateway=new|existing\` — never by hand) into one
supergraph via \`IntrospectAndCompose\`. Each subgraph's URL can be
overridden at runtime via \`<SUBGRAPH_NAME>_SERVICE_URL\` env vars without a
rebuild — see \`src/subgraphs.ts\`.

\`nx serve gateway\`
`,
  );
}
