import {
  formatFiles,
  joinPathFragments,
  updateJson,
  readProjectConfiguration,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { applicationGenerator } from '@nx/node';
import {
  ensureGateway,
  resolveGatewayMode,
  validateGatewayMode,
  type GatewayMode,
} from '../../utils/ensure-gateway';
import { addProjectTags } from '../../utils/add-project-tags';
import type { GraphqlServiceGeneratorSchema } from './schema';

export async function graphqlServiceGenerator(
  tree: Tree,
  options: GraphqlServiceGeneratorSchema,
) {
  const projectName = `${options.name}-service`;
  const projectRoot = `apps/${projectName}`;

  const gatewayMode = resolveGatewayMode(tree, options.gateway);
  validateGatewayMode(tree, gatewayMode);

  await applicationGenerator(tree, {
    directory: projectRoot,
    bundler: 'esbuild',
    framework: 'none',
    unitTestRunner: 'jest',
    linter: 'eslint',
    e2eTestRunner: 'none',
    swcJest: true,
  } as Parameters<typeof applicationGenerator>[1]);

  tree.delete(joinPathFragments(projectRoot, 'src/main.ts'));
  const mainSpecPath = joinPathFragments(projectRoot, 'src/main.spec.ts');
  if (tree.exists(mainSpecPath)) {
    tree.delete(mainSpecPath);
  }

  const port = pickServicePort(tree);

  writeGraphqlLayer(tree, projectRoot, options.name, gatewayMode);
  writeValidationLayer(tree, projectRoot);
  writeDatasource(tree, projectRoot, options.name, options.datasource);
  writeMiddleware(tree, projectRoot);
  writeContext(tree, projectRoot);
  writeServer(tree, projectRoot, options.name, port, gatewayMode);
  writeTests(tree, projectRoot, options.name, gatewayMode);
  patchBuildAssets(tree, projectName, projectRoot, options.datasource);
  addProjectTags(tree, projectName, ['type:service']);
  addServiceDependencies(tree, projectRoot, options.datasource, gatewayMode);
  writeReadme(tree, projectRoot, projectName, options.datasource, gatewayMode);

  await ensureGateway(tree, gatewayMode, {
    name: options.name,
    url: `http://localhost:${port}/graphql`,
  });

  await formatFiles(tree);
}

/** Scans every existing *-service's server.ts for its port so a new one never collides (4000 is reserved for the gateway). */
function pickServicePort(tree: Tree): number {
  const usedPorts = new Set<number>([4000]);
  if (tree.exists('apps')) {
    for (const appDir of tree.children('apps')) {
      if (!appDir.endsWith('-service')) {
        continue;
      }
      const content = tree.read(`apps/${appDir}/src/server.ts`, 'utf-8');
      const port = content
        ? /process\.env\['PORT'\] \?\? (\d+)/.exec(content)?.[1]
        : undefined;
      if (port) {
        usedPorts.add(Number(port));
      }
    }
  }
  let candidate = 4001;
  while (usedPorts.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}

function writeGraphqlLayer(
  tree: Tree,
  projectRoot: string,
  name: string,
  gatewayMode: GatewayMode,
): void {
  const federated = gatewayMode !== 'none';
  const { healthField, userType, userKeyDirective, mutationField, inputType } =
    schemaIdentifiers(name, federated);

  // Federated services namespace their example type/field names with the
  // service's own name — an identical "User"/"createUser"/"health" example
  // in every federated service would collide at composition time (Apollo
  // Federation requires a field resolved from multiple subgraphs to be
  // explicitly @shareable; two *different* User entities/mutations aren't
  // really the same shareable thing, so this generator gives each
  // federated service its own non-colliding example instead).
  const federationDirectives = federated
    ? `extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key", "@shareable"])

`
    : '';
  const healthDirective = federated ? ' @shareable' : '';

  tree.write(
    joinPathFragments(projectRoot, `src/graphql/schema/${name}.graphql`),
    `${federationDirectives}type Query {
  ${healthField}: String!${healthDirective}
}

type Mutation {
  ${mutationField}(input: ${inputType}!): ${userType}!
}

input ${inputType} {
  name: String!
  email: String!
}

type ${userType}${userKeyDirective} {
  id: ID!
  name: String!
  email: String!
}
`,
  );

  tree.write(
    joinPathFragments(
      projectRoot,
      `src/graphql/resolvers/${name}.resolvers.ts`,
    ),
    `import { userInputSchema } from '@nx-generators/shared-validation';
import { validateInput } from '../../validation/validate-input';
import { createUser } from '../../services/user.service';

/**
 * Resolvers stay thin — they validate at the boundary (see validation/) and
 * delegate everything else to services/, which owns the actual business
 * logic and datasource calls.
 */
export const resolvers = {
  Query: {
    ${healthField}: (): string => 'ok',
  },
  Mutation: {
    ${mutationField}: async (_parent: unknown, args: { input: unknown }) => {
      const input = validateInput(userInputSchema, args.input);
      return createUser(input);
    },
  },
};
`,
  );
}

function schemaIdentifiers(name: string, federated: boolean) {
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  return {
    healthField: federated ? `${camel}Health` : 'health',
    userType: federated ? `${pascal}User` : 'User',
    userKeyDirective: federated ? ' @key(fields: "id")' : '',
    mutationField: federated ? `create${pascal}User` : 'createUser',
    inputType: federated ? `Create${pascal}UserInput` : 'CreateUserInput',
  };
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

function writeValidationLayer(tree: Tree, projectRoot: string): void {
  tree.write(
    joinPathFragments(projectRoot, 'src/validation/validate-input.ts'),
    `import type { z } from 'zod';
import { toFieldErrors } from '@nx-generators/shared-validation';
import { AppError } from '@nx-generators/graphql-service-core';

/**
 * Validates a resolver's input against a schema from libs/shared-validation
 * before it reaches services/ — the single point every mutation/query
 * input passes through, per this workspace's validation convention.
 * Throws an AppError whose \`fieldErrors\` land on the GraphQL response's
 * extensions in exactly the shape libs/graphql-client's errorLink expects.
 */
export function validateInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Invalid input', toFieldErrors(result.error));
  }
  return result.data;
}
`,
  );
}

function writeDatasource(
  tree: Tree,
  projectRoot: string,
  name: string,
  datasource: GraphqlServiceGeneratorSchema['datasource'],
): void {
  if (datasource === 'rest') {
    tree.write(
      joinPathFragments(projectRoot, 'src/datasources/rest/rest-client.ts'),
      `const BASE_URL = process.env['REST_DATASOURCE_URL'] ?? 'http://localhost:9000';

/** Example REST datasource wrapper — swap the base URL/paths for the real upstream API this service fronts. */
export const restClient = {
  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(\`\${BASE_URL}\${path}\`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(\`REST datasource request failed: \${response.status} \${response.statusText}\`);
    }
    return (await response.json()) as T;
  },
};
`,
    );
    tree.write(
      joinPathFragments(projectRoot, 'src/services/user.service.ts'),
      `import type { UserInput } from '@nx-generators/shared-types';
import { restClient } from '../datasources/rest/rest-client';

export async function createUser(input: UserInput) {
  return restClient.post<{ id: string } & UserInput>('/users', input);
}
`,
    );
    return;
  }

  if (datasource === 'sql') {
    tree.write(
      joinPathFragments(projectRoot, 'prisma/schema.prisma'),
      `generator client {
  provider = "prisma-client-js"
  // Prisma 7 generates to a single shared node_modules/@prisma/client by
  // default — fatal in a monorepo with multiple services, each with its
  // own schema: whichever service last ran \`prisma generate\` silently
  // clobbers every other service's generated client/types. Scoping output
  // per service avoids that collision entirely.
  output   = "../src/generated/prisma-client"
}

// Prisma 7: no "url" here — connection info lives in prisma.config.ts (for
// the CLI) and is passed to the driver adapter at the PrismaClient
// constructor (for runtime queries). See datasources/sql/prisma-client.ts.
datasource db {
  provider = "sqlite"
}

model User {
  id    String @id @default(uuid())
  name  String
  email String @unique
}
`,
    );
    tree.write(
      joinPathFragments(projectRoot, 'prisma.config.ts'),
      `import { defineConfig } from 'prisma/config';

// Local-dev default (SQLite file, git-ignored) — swap for a real Postgres/MySQL
// URL + adapter in production. Not a production datasource topology.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db' },
});
`,
    );
    tree.write(
      joinPathFragments(projectRoot, 'src/datasources/sql/prisma-client.ts'),
      `import { join } from 'node:path';
import { PrismaClient } from '../../generated/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Prisma 7 requires an explicit driver adapter for every database, even
// SQLite — this is the local-dev default; swap the adapter for a
// Postgres/MySQL one in production. Resolved relative to process.cwd()
// (the workspace root, which is what \`nx serve\`/\`nx test\` always run
// with) rather than a bare relative path, since a relative \`file:\` URL
// would otherwise resolve against whatever directory happens to invoke
// the process instead of consistently finding this service's own db file.
const defaultDbPath = join(process.cwd(), '${projectRoot}/prisma/dev.db');
const adapter = new PrismaBetterSqlite3({ url: process.env['DATABASE_URL'] ?? \`file:\${defaultDbPath}\` });

export const prisma = new PrismaClient({ adapter });
`,
    );
    tree.write(
      joinPathFragments(projectRoot, 'src/services/user.service.ts'),
      `import type { UserInput } from '@nx-generators/shared-types';
import { prisma } from '../datasources/sql/prisma-client';

export async function createUser(input: UserInput) {
  return prisma.user.create({ data: input });
}
`,
    );
    tree.write(
      joinPathFragments(projectRoot, 'prisma/.gitignore'),
      'dev.db\ndev.db-journal\n',
    );
    tree.write(
      joinPathFragments(projectRoot, 'src/generated/.gitignore'),
      '*\n',
    );
    excludeGeneratedFromTsconfig(tree, projectRoot);
    return;
  }

  // nosql
  tree.write(
    joinPathFragments(projectRoot, 'src/datasources/nosql/mongo-client.ts'),
    `import { MongoClient, type Collection, type Document } from 'mongodb';

const MONGO_URL = process.env['MONGO_URL'] ?? 'mongodb://localhost:27017';
const DB_NAME = process.env['MONGO_DB_NAME'] ?? '${name}_service';

let client: MongoClient | undefined;

async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
  }
  return client;
}

export async function getUsersCollection(): Promise<Collection<Document>> {
  const connected = await getClient();
  return connected.db(DB_NAME).collection('users');
}
`,
  );
  tree.write(
    joinPathFragments(projectRoot, 'src/services/user.service.ts'),
    `import { randomUUID } from 'node:crypto';
import type { UserInput } from '@nx-generators/shared-types';
import { getUsersCollection } from '../datasources/nosql/mongo-client';

export async function createUser(input: UserInput) {
  const doc = { id: randomUUID(), ...input };
  const users = await getUsersCollection();
  await users.insertOne(doc);
  return doc;
}
`,
  );
}

function writeMiddleware(tree: Tree, projectRoot: string): void {
  tree.write(
    joinPathFragments(projectRoot, 'src/middleware/index.ts'),
    `import { createLoggingPlugin } from '@nx-generators/graphql-service-core';

/** Composed with libs/graphql-service-core's shared middleware — add this service's own (e.g. auth verification) alongside it. */
export const plugins = [createLoggingPlugin()];
`,
  );
}

function writeContext(tree: Tree, projectRoot: string): void {
  tree.write(
    joinPathFragments(projectRoot, 'src/context/index.ts'),
    `import type { IncomingMessage } from 'node:http';
import { createBaseContext, type BaseContext } from '@nx-generators/graphql-service-core';

export type AppContext = BaseContext;

/** Composes libs/graphql-service-core's base context — add auth principal, dataloaders, etc. here as this service grows. */
export async function createContext({ req }: { req: IncomingMessage }): Promise<AppContext> {
  const requestId = req.headers['x-request-id'];
  return createBaseContext({ requestId: typeof requestId === 'string' ? requestId : undefined });
}
`,
  );
}

function writeServer(
  tree: Tree,
  projectRoot: string,
  name: string,
  port: number,
  gatewayMode: GatewayMode,
): void {
  const federated = gatewayMode !== 'none';

  const body = federated
    ? `import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { formatError } from '@nx-generators/graphql-service-core';
import { resolvers } from './graphql/resolvers/${name}.resolvers';
import { plugins } from './middleware';
import { createContext } from './context';

const typeDefs = parse(readFileSync(join(__dirname, 'graphql/schema/${name}.graphql'), 'utf-8'));
const schema = buildSubgraphSchema({ typeDefs, resolvers });

// plugins/formatError come from libs/graphql-service-core, resolved through
// this workspace's dev-mode source condition — @apollo/server's own
// internal CJS/ESM-split type declarations sometimes make that cross-package
// reference structurally-identical-but-nominally-distinct from what this
// file's own @apollo/server import expects (doesn't affect runtime).
const server = new ApolloServer({ schema, plugins, formatError } as ConstructorParameters<typeof ApolloServer>[0]);

async function main() {
  const port = Number(process.env['PORT'] ?? ${port});
  const { url } = await startStandaloneServer(server, { context: createContext, listen: { port } });
  console.log(\`${name}-service ready at \${url} (federated subgraph)\`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
`
    : `import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { formatError } from '@nx-generators/graphql-service-core';
import { resolvers } from './graphql/resolvers/${name}.resolvers';
import { plugins } from './middleware';
import { createContext } from './context';

const typeDefs = readFileSync(join(__dirname, 'graphql/schema/${name}.graphql'), 'utf-8');

// See the federated server.ts variant's comment on this cast — same
// cross-package type-resolution quirk, not a real type error.
const server = new ApolloServer({ typeDefs, resolvers, plugins, formatError } as ConstructorParameters<typeof ApolloServer>[0]);

async function main() {
  const port = Number(process.env['PORT'] ?? ${port});
  const { url } = await startStandaloneServer(server, { context: createContext, listen: { port } });
  console.log(\`${name}-service ready at \${url}\`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
`;

  tree.write(joinPathFragments(projectRoot, 'src/server.ts'), body);
}

function writeTests(
  tree: Tree,
  projectRoot: string,
  name: string,
  gatewayMode: GatewayMode,
): void {
  const { healthField, mutationField } = schemaIdentifiers(
    name,
    gatewayMode !== 'none',
  );

  tree.write(
    joinPathFragments(
      projectRoot,
      `src/graphql/resolvers/${name}.resolvers.spec.ts`,
    ),
    `import { resolvers } from './${name}.resolvers';
import { AppError } from '@nx-generators/graphql-service-core';

describe('${name} resolvers', () => {
  it('health returns ok', () => {
    expect(resolvers.Query.${healthField}()).toBe('ok');
  });

  it('rejects an invalid input with a VALIDATION_ERROR AppError', async () => {
    await expect(resolvers.Mutation.${mutationField}(undefined, { input: { name: '', email: 'not-an-email' } })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<AppError>);
  });
});
`,
  );

  tree.write(
    joinPathFragments(projectRoot, 'src/validation/validate-input.spec.ts'),
    `import { z } from 'zod';
import { validateInput } from './validate-input';
import { AppError } from '@nx-generators/graphql-service-core';

describe('validateInput', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('returns the parsed input on success', () => {
    expect(validateInput(schema, { name: 'Ada' })).toEqual({ name: 'Ada' });
  });

  it('throws an AppError with fieldErrors on failure', () => {
    try {
      validateInput(schema, { name: '' });
      throw new Error('expected validateInput to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).fieldErrors).toHaveProperty('name');
    }
  });
});
`,
  );
}

/**
 * Points the build target at src/server.ts (this generator deletes the
 * default src/main.ts) and ships graphql/schema/*.graphql alongside the
 * built output. Uses the project-configuration devkit API rather than
 * poking at package.json/project.json directly, since @nx/node:application
 * inlines target config into package.json for some apps and writes a
 * standalone project.json for others — readProjectConfiguration/
 * updateProjectConfiguration handle both transparently.
 */
/**
 * `tsconfig.app.json`'s default `include: ["src/**\/*.ts"]` also matches
 * `*.d.ts` (it ends in `.ts` too), pulling Prisma's generated ambient
 * declaration files into esbuild's own per-file compilation unit — esbuild
 * (unlike tsc) doesn't understand ambient `.d.ts` syntax and fails trying
 * to emit runtime JS for it ("The constant ... must be initialized").
 * Excluding the generated dir keeps it reachable via normal module
 * resolution (imports still type-check fine) without being directly
 * "included" as a source file of this project.
 */
function excludeGeneratedFromTsconfig(tree: Tree, projectRoot: string): void {
  for (const tsconfigFile of ['tsconfig.app.json', 'tsconfig.spec.json']) {
    const path = joinPathFragments(projectRoot, tsconfigFile);
    if (!tree.exists(path)) {
      continue;
    }
    updateJson(tree, path, (json) => {
      const exclude: string[] = json.exclude ?? [];
      if (!exclude.includes('src/generated/**')) {
        exclude.push('src/generated/**');
      }
      json.exclude = exclude;
      return json;
    });
  }
}

function patchBuildAssets(
  tree: Tree,
  projectName: string,
  projectRoot: string,
  datasource: GraphqlServiceGeneratorSchema['datasource'],
): void {
  const config = readProjectConfiguration(tree, projectName);
  const buildTarget = config.targets?.['build'];
  if (!buildTarget) {
    return;
  }
  // esbuild's bundle:false preserves the full source path under dist
  // (dist/apps/<name>-service/src/server.js, not dist/server.js), so each
  // asset's output path must mirror that same nesting to land next to the
  // compiled server.js that reads it via __dirname / requires it.
  const assets: unknown[] = [
    ...((buildTarget.options?.['assets'] as unknown[] | undefined) ?? []),
    {
      input: joinPathFragments(projectRoot, 'src/graphql/schema'),
      glob: '*.graphql',
      output: joinPathFragments(projectRoot, 'src/graphql/schema'),
    },
  ];
  if (datasource === 'sql') {
    // Prisma's generated client is excluded from this project's own TS
    // compilation (see excludeGeneratedFromTsconfig) since esbuild can't
    // process its ambient .d.ts files as source — but the compiled
    // server.js still `require()`s it directly at runtime, so it must be
    // copied into dist verbatim rather than compiled.
    assets.push({
      input: joinPathFragments(projectRoot, 'src/generated/prisma-client'),
      glob: '**/*',
      output: joinPathFragments(projectRoot, 'src/generated/prisma-client'),
    });
  }
  buildTarget.options = {
    ...buildTarget.options,
    main: joinPathFragments(projectRoot, 'src/server.ts'),
    assets,
  };
  updateProjectConfiguration(tree, projectName, config);
}

function addServiceDependencies(
  tree: Tree,
  projectRoot: string,
  datasource: GraphqlServiceGeneratorSchema['datasource'],
  gatewayMode: GatewayMode,
): void {
  const deps: Record<string, string> = {
    '@apollo/server': '^5.5.1',
    graphql: '^17.0.2',
    '@nx-generators/shared-validation': '*',
    '@nx-generators/shared-types': '*',
    '@nx-generators/graphql-service-core': '*',
  };
  if (gatewayMode !== 'none') {
    deps['@apollo/subgraph'] = '^2.14.3';
  }
  if (datasource === 'sql') {
    deps['@prisma/client'] = '^7.9.1';
    deps['@prisma/adapter-better-sqlite3'] = '^7.9.1';
    deps['better-sqlite3'] = '*';
    deps['prisma'] = '^7.9.1';
  }
  if (datasource === 'nosql') {
    deps['mongodb'] = '*';
  }

  const packageJsonPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(packageJsonPath)) {
    updateJson(tree, packageJsonPath, (json) => {
      json.dependencies = { ...json.dependencies, ...deps };
      return json;
    });
  }
}

function writeReadme(
  tree: Tree,
  projectRoot: string,
  projectName: string,
  datasource: GraphqlServiceGeneratorSchema['datasource'],
  gatewayMode: GatewayMode,
): void {
  const federationNote =
    gatewayMode === 'none'
      ? 'Standalone — no federation directives, no dependency on apps/gateway.'
      : `Federated subgraph, registered in apps/gateway (${gatewayMode === 'new' ? 'created by this generator run' : 'already existed'}).`;

  const datasourceSetup =
    datasource === 'sql'
      ? '\n## Local DB setup\n\n`npx prisma generate --schema=prisma/schema.prisma` then `npx prisma db push --schema=prisma/schema.prisma` once, before the first `nx serve`.\n'
      : datasource === 'nosql'
        ? '\n## Local DB setup\n\nNeeds a MongoDB instance reachable at `MONGO_URL` (defaults to `mongodb://localhost:27017`).\n'
        : '';

  tree.write(
    joinPathFragments(projectRoot, 'README.md'),
    `# ${projectName}

A GraphQL microservice generated by \`nx g graphql-service\`, backed by a ${datasource} datasource.

${federationNote}
${datasourceSetup}
## Structure

Resolvers (\`graphql/resolvers/\`) stay thin: they validate input via
\`validation/\` (schemas from \`libs/shared-validation\`) before delegating to
\`services/\`, which owns business logic and datasource calls
(\`datasources/${datasource}/\`).

\`nx serve ${projectName}\`
`,
  );
}

export default graphqlServiceGenerator;
