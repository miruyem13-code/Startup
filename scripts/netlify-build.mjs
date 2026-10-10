import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (args, env = process.env) => {
  const result = spawnSync(npm, args, { stdio: 'inherit', shell: process.platform === 'win32', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Prisma generation needs PostgreSQL URLs, but does not connect to the database.
// Use build-only placeholders for missing/SQLite local URLs; runtime requires real URLs.
const postgresUrl = (value) => value && /^postgres(?:ql)?:\/\//i.test(value);
run(['run', 'db:postgres:generate'], {
  ...process.env,
  DATABASE_URL: postgresUrl(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : 'postgresql://build:build@127.0.0.1:5432/build?schema=public',
  DIRECT_URL: postgresUrl(process.env.DIRECT_URL)
    ? process.env.DIRECT_URL
    : 'postgresql://build:build@127.0.0.1:5432/build?schema=public',
});
run(['run', 'build']);
