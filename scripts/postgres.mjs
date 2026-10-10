import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const schema = fs
  .readFileSync('prisma/schema.prisma', 'utf8')
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('url = env("DATABASE_URL")', 'url = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")');
const migrationFile = 'prisma/postgres/migrations/202610100001_initial/migration.sql';
const schemaFile = 'prisma/postgres/schema.prisma';
const refreshInitial = process.argv.includes('--refresh-initial');
if (fs.existsSync(migrationFile) && !refreshInitial) {
  if (!fs.existsSync(schemaFile) || fs.readFileSync(schemaFile, 'utf8') !== schema) {
    console.error(
      'The PostgreSQL schema differs from the checked-in initial migration. Refusing to rewrite migration history. Before first deployment only, run db:postgres:prepare:initial; after deployment, author a new migration instead.',
    );
    process.exit(1);
  }
  console.log('PostgreSQL schema and initial migration are already prepared. No files or database were changed.');
  process.exit(0);
}
fs.mkdirSync('prisma/postgres/migrations/202610100001_initial', { recursive: true });
fs.writeFileSync(schemaFile, schema);
const result = spawnSync(
  'node',
  [
    'node_modules/prisma/build/index.js',
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema-datamodel',
    'prisma/postgres/schema.prisma',
    '--script',
  ],
  { encoding: 'utf8' },
);
if (result.status) {
  console.error(result.stderr);
  process.exit(result.status || 1);
}
fs.writeFileSync('prisma/postgres/migrations/migration_lock.toml', 'provider = "postgresql"\n');
const spatial = `
-- The custom API uses a private server-side DB role; disable direct anonymous table access.
DO $$ DECLARE tbl record; BEGIN FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename); END LOOP; END $$;
-- PostGIS polygon data is derived from the validated GeoJSON source.
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE "Territory" ADD COLUMN "spatial" geometry(Polygon,4326);
CREATE INDEX "Territory_spatial_gist" ON "Territory" USING GIST ("spatial");
CREATE OR REPLACE FUNCTION velocity_sync_territory_geometry() RETURNS trigger AS $$
BEGIN NEW."spatial" := ST_SetSRID(ST_GeomFromGeoJSON(NEW."geometry"::text),4326); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER velocity_territory_geometry BEFORE INSERT OR UPDATE OF "geometry" ON "Territory" FOR EACH ROW EXECUTE FUNCTION velocity_sync_territory_geometry();
CREATE UNIQUE INDEX "Rental_active_bike" ON "Rental"("bikeId") WHERE "state" IN ('RESERVED','ACTIVE');
CREATE UNIQUE INDEX "Rental_active_user" ON "Rental"("userId") WHERE "state" IN ('RESERVED','ACTIVE');
`;
fs.writeFileSync(
  migrationFile,
  result.stdout.replaceAll('DEFAULT {},', "DEFAULT '{}',") + spatial,
);
console.log(
  'Prepared PostgreSQL/PostGIS schema and initial migration. No server was contacted. Runtime validation remains required.',
);
