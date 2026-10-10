import { spawnSync } from 'node:child_process';
import { bundleBackend } from './vercel-bundle.mjs';

const result = spawnSync(process.execPath, ['scripts/netlify-build.mjs'], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
// Explicit release operation; secrets stay in Vercel and migrations never run per request.
if (process.env.VELOCITY_MIGRATE === '1') {
  const migration = spawnSync(process.execPath, ['scripts/postgres-migrate.mjs'], { stdio: 'inherit' });
  if (migration.error) throw migration.error;
  if (migration.status !== 0) process.exit(migration.status ?? 1);
}
await bundleBackend();
