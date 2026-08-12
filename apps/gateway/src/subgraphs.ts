import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface SubgraphsFile {
  subgraphs: Array<{ name: string; url: string }>;
}

// Read via fs rather than a TS JSON import — matches the pattern each
// graphql-service uses for its schema.graphql, and sidesteps a composite
// TS project-references quirk (TS6307) that a plain JSON import into an
// esbuild-bundled app tripped here.
const subgraphsData = JSON.parse(
  readFileSync(join(__dirname, 'subgraphs.json'), 'utf-8'),
) as SubgraphsFile;

/**
 * Wraps the generator-managed subgraphs.json (the mutation target
 * `nx g graphql-service` edits) with env-var overrides, so the same
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
  return `${subgraphName.toUpperCase().replace(/-/g, '_')}_SERVICE_URL`;
}
