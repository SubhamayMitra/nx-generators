import { join } from 'node:path';
import { PrismaClient } from '../../generated/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Prisma 7 requires an explicit driver adapter for every database, even
// SQLite — this is the local-dev default; swap the adapter for a
// Postgres/MySQL one in production. Resolved relative to process.cwd()
// (the workspace root, which is what `nx serve`/`nx test` always run
// with) rather than a bare relative path, since a relative `file:` URL
// would otherwise resolve against whatever directory happens to invoke
// the process instead of consistently finding this service's own db file.
const defaultDbPath = join(
  process.cwd(),
  'apps/storefront/search-service/prisma/dev.db',
);
const adapter = new PrismaBetterSqlite3({
  url: process.env['DATABASE_URL'] ?? `file:${defaultDbPath}`,
});

export const prisma = new PrismaClient({ adapter });
