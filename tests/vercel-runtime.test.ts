import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

describe('compiled Vercel runtime', () => {
  it('loads the complete API dependency graph in native Node ESM', () => {
    const cache = resolve('node_modules/.cache');
    mkdirSync(cache, { recursive: true });
    const output = mkdtempSync(join(cache, 'velocity-runtime-'));
    try {
      writeFileSync(join(output, 'package.json'), JSON.stringify({ type: 'module' }));
      const compile = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const source = join(directory, entry.name);
          if (entry.isDirectory()) compile(source);
          else if (entry.name.endsWith('.ts')) {
            const destination = join(output, source.replace(/\.ts$/, '.js'));
            mkdirSync(dirname(destination), { recursive: true });
            writeFileSync(destination, ts.transpileModule(readFileSync(source, 'utf8'), {
              compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
            }).outputText);
          }
        }
      };
      for (const directory of ['api', 'apps/api/src', 'packages/shared']) compile(directory);
      const entry = pathToFileURL(join(output, 'api/index.js')).href;
      const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `
        import { createServer } from 'node:http';
        import assert from 'node:assert/strict';
        const { default: handler } = await import(${JSON.stringify(entry)});
        const server = createServer(handler);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        try {
          const base = 'http://127.0.0.1:' + server.address().port;
          const session = await fetch(base + '/api/index?__velocity_path=session');
          assert.equal(session.status, 200);
          assert.equal((await session.json()).user, null);
          const rejected = await fetch(base + '/api/index?__velocity_path=auth/register', {
            method: 'POST', headers: { Origin: 'https://untrusted.example' }
          });
          assert.equal(rejected.status, 403);
          assert.equal((await rejected.json()).message, 'Invalid request origin.');
          console.log('Native production ESM: session and origin validation passed');
        } finally { await new Promise(resolve => server.close(resolve)); }
      `], {
        encoding: 'utf8', timeout: 15000,
        env: {
          ...process.env, NODE_ENV: 'production', DEMO_MODE: 'false',
          APP_ORIGIN: 'https://velocity-eight-dun.vercel.app',
          DATABASE_URL: 'postgresql://runtime:runtime@127.0.0.1:5432/runtime',
          DIRECT_URL: 'postgresql://runtime:runtime@127.0.0.1:5432/runtime',
        },
      });
      expect(result.error, result.error?.message).toBeUndefined();
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain('session and origin validation passed');
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });
});
