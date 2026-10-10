import { expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

it('runs the deployed CommonJS wrapper and bundle in native production Node', () => {
  const cache = resolve('node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const output = mkdtempSync(join(cache, 'velocity-bundle-'));
  try {
    const bundle = join(output, '.vercel-backend/handler.cjs');
    const script = pathToFileURL(resolve('scripts/vercel-bundle.mjs')).href;
    const built = spawnSync(process.execPath, ['--input-type=module', '--eval',
      `const {bundleBackend} = await import(${JSON.stringify(script)}); await bundleBackend(${JSON.stringify(bundle)});`],
      { encoding: 'utf8', timeout: 15000 });
    expect(built.status, built.stderr).toBe(0);
    mkdirSync(join(output, 'api'));
    copyFileSync('api/index.js', join(output, 'api/index.js'));
    copyFileSync('api/package.json', join(output, 'api/package.json'));
    const entry = pathToFileURL(join(output, 'api/index.js')).href;
    const smoke = `
      import { createServer } from 'node:http';
      import assert from 'node:assert/strict';
      const {default: handler} = await import(${JSON.stringify(entry)});
      const server = createServer(handler);
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      try {
        const base = 'http://127.0.0.1:' + server.address().port;
        const response = await fetch(base + '/api/index?__velocity_path=session');
        const body = await response.json();
        if (process.env.CHECK_MISSING_DATABASE) {
          assert.equal(response.status, 503);
          assert.equal(body.code, 'BACKEND_INITIALIZATION_FAILED');
          assert.ok(!JSON.stringify(body).includes('DATABASE_URL'));
        } else {
          assert.equal(response.status, 200);
          assert.equal(body.user, null);
          const rejected = await fetch(base + '/api/index?__velocity_path=auth/register', {
            method: 'POST', headers: { Origin: 'https://untrusted.example' }
          });
          assert.equal(rejected.status, 403);
          assert.equal((await rejected.json()).message, 'Invalid request origin.');
        }
      } finally { await new Promise(resolve => server.close(resolve)); }
    `;
    for (const missingDatabase of [false, true]) {
      const result = spawnSync(process.execPath, ['--input-type=module', '--eval', smoke], {
        encoding: 'utf8', timeout: 15000,
        env: { ...process.env, NODE_ENV: 'production', DEMO_MODE: 'false',
          APP_ORIGIN: 'https://velocity-eight-dun.vercel.app',
          DATABASE_URL: missingDatabase ? '' : 'postgresql://runtime:runtime@127.0.0.1:5432/runtime',
          CHECK_MISSING_DATABASE: missingDatabase ? '1' : '',
        },
      });
      expect(result.status, result.stderr || result.error?.message).toBe(0);
    }
  } finally { rmSync(output, { recursive: true, force: true }); }
});
