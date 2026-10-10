import { spawnSync } from 'node:child_process';

if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const postgresUrl = (name) => {
  const value = process.env[name];
  if (!value || !/^postgres(?:ql)?:\/\//i.test(value)) {
    console.error(`${name} must be set to a PostgreSQL connection URL.`);
    process.exit(1);
  }
  return value;
};

postgresUrl('DATABASE_URL');
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
postgresUrl('DIRECT_URL');

const result = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/postgres/schema.prisma'],
  { stdio: 'inherit', env: process.env },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
