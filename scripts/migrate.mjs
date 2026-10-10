import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
if (fs.existsSync('.env')) process.loadEnvFile('.env');
// Pre-create the file: Prisma's Windows engine may return an opaque error for a missing SQLite file.
const databasePath = process.env.DATABASE_URL?.replace(/^file:/, '') || './velocity.db';
if (!databasePath.startsWith('postgres')) {
  const local = new DatabaseSync(new URL('../prisma/' + databasePath, import.meta.url));
  local.close();
}
const schema = 'prisma/schema.prisma';
// Generate the initial SQL from the checked-in schema, then use deploy for all runs.
if (!fs.existsSync('prisma/migrations/202610100001_initial/migration.sql')) {
  const result = spawnSync(
    'node',
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema-datamodel',
      schema,
      '--script',
    ],
    { encoding: 'utf8' },
  );
  if (result.status) {
    console.error(result.stderr);
    process.exit(result.status || 1);
  }
  fs.mkdirSync('prisma/migrations/202610100001_initial', { recursive: true });
  fs.writeFileSync('prisma/migrations/202610100001_initial/migration.sql', result.stdout);
  fs.writeFileSync('prisma/migrations/migration_lock.toml', 'provider = "sqlite"\n');
}
const result = spawnSync('node', ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  stdio: 'inherit',
});
process.exit(result.status || 0);
