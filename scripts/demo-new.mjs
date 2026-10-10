import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo creation is forbidden in production.');
const filename = `velocity-demo-${Date.now()}.db`;
const file = path.resolve('prisma', filename);
if (!file.startsWith(path.resolve('prisma') + path.sep)) throw new Error('Unsafe demo path');
const database = new DatabaseSync(file);
database.exec(fs.readFileSync('prisma/migrations/202610100001_initial/migration.sql', 'utf8'));
database.close();
const result = spawnSync(
  process.execPath,
  ['--env-file-if-exists=.env', '--import', 'tsx', 'prisma/seed.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: `file:./${filename}`, DEMO_MODE: 'true' },
  },
);
if (result.status) process.exit(result.status || 1);
console.log(
  `New isolated demo database created. Set DATABASE_URL="file:./${filename}" in .env and restart the API. Existing databases are preserved.`,
);
