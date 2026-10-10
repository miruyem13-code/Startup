import { spawnSync } from 'node:child_process';
import { bundleBackend } from './vercel-bundle.mjs';

const result = spawnSync(process.execPath, ['scripts/netlify-build.mjs'], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await bundleBackend();
