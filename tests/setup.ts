import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const path = resolve('prisma/test.db');
if (!path.replaceAll('\\', '/').endsWith('/prisma/test.db'))
  throw new Error('Unsafe test database path.');
const db = new DatabaseSync(path);
db.exec('PRAGMA foreign_keys=OFF;');
for (const row of db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all() as { name: string }[])
  db.exec(`DROP TABLE "${row.name.replaceAll('"', '""')}"`);
for (const migration of readdirSync('prisma/migrations').sort()) {
  const sql = `prisma/migrations/${migration}/migration.sql`;
  try {
    db.exec(readFileSync(sql, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
db.close();
