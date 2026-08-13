import { defineConfig } from 'prisma/config';

// Local-dev default (SQLite file, git-ignored) — swap for a real Postgres/MySQL
// URL + adapter in production. Not a production datasource topology.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db' },
});
