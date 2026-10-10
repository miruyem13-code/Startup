import { DatabaseSync } from 'node:sqlite';
import { readFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
const path = resolve('prisma/velocity.db');
const database = new DatabaseSync(path);
const columns = database.prepare('PRAGMA table_info("User")').all();
if (columns.some((column) => column.name === 'notificationPreferences')) {
  database.close();
  throw new Error('User schema already updated; do not run migration recovery again.');
}
database.exec('PRAGMA wal_checkpoint(TRUNCATE);');
const backup = path.replace(/\.db$/, `-before-competition-recovery-${Date.now()}.db`);
copyFileSync(path, backup);
const sql = readFileSync('prisma/migrations/202610100003_competitions/migration.sql', 'utf8');
const start = sql.indexOf('CREATE TABLE "new_User"');
if (start < 0) throw new Error('Expected User migration missing.');
const count = database.prepare('SELECT COUNT(*) AS count FROM "User"').get().count;
database.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
try {
  database.exec(sql.slice(start));
  if (database.prepare('SELECT COUNT(*) AS count FROM "User"').get().count !== count)
    throw new Error('User count changed during migration.');
  database.exec('COMMIT; PRAGMA foreign_keys=ON;');
  const failures = database.prepare('PRAGMA foreign_key_check;').all();
  if (failures.length) throw new Error('Referential integrity check failed.');
  console.log(`Migration tail recovered; ${count} accounts preserved. Backup: ${backup}`);
} catch (error) {
  try {
    database.exec('ROLLBACK;');
  } catch {
    /* A committed migration is preserved. */
  }
  throw error;
} finally {
  database.close();
}
