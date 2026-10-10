import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// Content polling avoids spurious Windows directory notifications and watches
// only source files, never SQLite data or generated browser artifacts.
async function fingerprint() {
  const hash = createHash('sha256');
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (/\.(?:ts|js|mjs|json)$/.test(entry.name)) {
        hash.update(path);
        hash.update(await readFile(path));
      }
    }
  }
  await visit('apps/api/src');
  await visit('packages/shared');
  return hash.digest('hex');
}

let current = await fingerprint();
let child;
let stopping = false;
let checking = false;
function launch() {
  child = spawn(
    process.execPath,
    ['--env-file-if-exists=.env', '--import', 'tsx', 'apps/api/src/server.ts'],
    { stdio: 'inherit', windowsHide: true },
  );
  child.on('error', (error) => console.error('API startup failed:', error.message));
}
launch();
const timer = setInterval(async () => {
  if (checking || stopping) return;
  checking = true;
  try {
    const next = await fingerprint();
    if (next !== current) {
      current = next;
      console.log('API source changed; restarting.');
      if (child.exitCode === null) {
        await new Promise((resolve) => {
          child.once('exit', resolve);
          child.kill();
        });
      }
      if (!stopping) launch();
    }
  } catch (error) {
    console.error('API source check failed:', error.message);
  } finally {
    checking = false;
  }
}, 1000);
function shutdown() {
  stopping = true;
  clearInterval(timer);
  if (child.exitCode === null) child.kill();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
