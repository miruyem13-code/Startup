# Deployment and Supabase setup

The API already uses Prisma for its persistent data and the existing password-hash/session authentication. SQLite remains the default local database. PostgreSQL support is generated from the same Prisma data model and retains the custom API authentication; the browser must never connect to PostgreSQL or receive a Supabase service-role key.

## Create the cloud database

1. Create a Supabase account and a project on the free plan. Choose a region near the API host and save the database password in a password manager.
2. In the Supabase SQL Editor or Database Extensions screen, enable PostGIS before the first migration. The migration creates the territory geometry column, trigger and GiST index, and requires that extension.
3. In Project Settings → Database, copy the PostgreSQL connection details. Set `DATABASE_URL` to the Supavisor transaction-pooler URI (port 6543, with `pgbouncer=true` and `sslmode=require`) for API traffic. Set `DIRECT_URL` to the direct database URI (port 5432, with SSL required) for Prisma migrations. If the API host cannot reach Supabase's direct endpoint over IPv6, use Supabase's session-pooler URI for `DIRECT_URL` instead. URL-encode special characters in the database password.
4. Put both URLs in the API host's secret/environment settings. For local API testing, put them in the ignored root `.env`. Never put them in `VITE_*` variables, frontend source, or a committed file. Keep `DATABASE_URL` and `DIRECT_URL` server-side.
5. From the project root, generate the PostgreSQL client and apply the checked-in initial migration:

   ```powershell
   npm.cmd run db:postgres:generate
   npm.cmd run db:postgres:migrate
   ```

   `db:postgres:migrate` refuses non-PostgreSQL URLs and runs `prisma migrate deploy` against `DIRECT_URL`. It does not seed demonstration or privileged accounts. Check that the Supabase migration history contains `202610100001_initial`, then start the API with `NODE_ENV=production`, `DEMO_MODE=false`, `DATABASE_URL`, `DIRECT_URL`, and an HTTPS `APP_ORIGIN`.

The checked-in PostgreSQL schema and initial migration are prepared, but cloud integration is not verified until these credentials are configured and registration/login plus protected database writes are tested against the project's Supabase instance. No Supabase credentials are currently configured in this workspace.

## Admin access

The admin panel is `/admin` on the web origin: locally `http://127.0.0.1:5173/admin`, and in production `https://<your-frontend-domain>/admin`. Sign in first at `/login`. The currently configured local database has an active `ADMIN` account, `admin@velocity.demo`; its password is the `DEMO_ADMIN_PASSWORD` value used when that local demo database was initially seeded. Check which database is configured with `npm run admin:status`; this prints administrator emails/roles only and never reads or prints password hashes.

If the existing password is unavailable, create a separate privileged operator account with `npm run admin:provision`. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` (at least 16 characters) in the process environment for that one run; the command creates a `SUPER_ADMIN`, stores only a scrypt hash, and writes an audit entry. Do not set this password in frontend variables or commit it. For local bootstrap, use the ignored `.env` temporarily and remove `ADMIN_PASSWORD` after provisioning; in production run the command against the configured database using your host's secret manager, then remove the one-time secret. Log in at `/login` with the provisioned email and password; the admin link and dashboard are available at `/admin`.

The React route guard restricts admin pages to `ADMIN` and `SUPER_ADMIN`, and the API independently checks those roles on admin endpoints. Registration cannot choose a privileged role. Run `npm run admin:status` after provisioning to confirm the account exists in the selected database.

## Migration safety

`npm run db:postgres:prepare` generates the PostgreSQL Prisma schema from `prisma/schema.prisma`. It will refuse to overwrite an existing initial migration. `npm run db:postgres:prepare:initial` explicitly regenerates that initial migration and is only appropriate before it has been applied anywhere. Once deployed, never regenerate or edit an applied migration; create a new timestamped directory under `prisma/postgres/migrations` and deploy it with `db:postgres:migrate`.

The API uses Prisma's generated PostgreSQL client at runtime. Regenerate for the production provider after installing dependencies and before building/running the API. The Dockerfile does this using build-only placeholder URLs; no real credentials are needed in the image build. Apply database migrations as a release step before deploying code that depends on them.

## Hosting

Build the frontend with `npm run build`; serve `dist` with SPA fallback to `index.html`. Proxy `/api` and `/socket.io` to the API on the same origin. `docker/nginx.conf` supplies forwarding and WebSocket upgrades. Configure HTTPS at the host or reverse proxy. Set `APP_ORIGIN` to the public HTTPS frontend origin and `TRUST_PROXY=1` only when the API sits behind one trusted proxy. Production startup refuses a missing/non-HTTPS `APP_ORIGIN`; cookies become Secure.

Keep Supabase database access private, enable automated backups appropriate to the selected plan, and rotate the database password if it is exposed. Supabase Auth is not used: the existing API stores only scrypt password hashes and hashed session tokens in PostgreSQL, with same-origin secure cookies and CSRF validation.

### Netlify

The repository `netlify.toml` builds from the repository root and deploys the existing Express app as a Netlify Function at `/api/*`; do not set the Netlify base directory to `apps/api`. Add these server-side environment variables in Netlify Project configuration → Environment variables for the deploy contexts you use: `NODE_ENV=production`, `DEMO_MODE=false`, `APP_ORIGIN=https://<your-site>.netlify.app` (or your exact custom domain), `DATABASE_URL` (Supabase pooled PostgreSQL URL), and `DIRECT_URL` (Supabase direct/session-pooler URL). `APP_ORIGIN` must exactly equal the browser origin, including scheme and any custom domain; this preserves origin validation and secure same-site cookies. Never use `*` or put database URLs in `VITE_*` variables.

The Netlify build creates the PostgreSQL Prisma client without connecting to the database. Before the first production deploy, apply migrations from a trusted local terminal configured with the same Supabase URLs (`npm.cmd run db:postgres:migrate` on Windows, `npm run db:postgres:migrate` elsewhere). Then deploy and check `https://<your-site>/api/health`. Registration/login need the configured database and exact `APP_ORIGIN`; the cloud integration is unverified until those credentials are configured and real account/session flows are tested. Netlify Functions serve the REST API; the persistent Socket.IO listener in `apps/api/src/server.ts` requires a long-running Node host, so realtime push updates are not available on Netlify's function runtime.

### Vercel

The root `vercel.json` keeps Vite's `dist` output and the root `api/index.ts` function serves the existing Express REST API under `/api/*`. Keep Vercel's Root Directory set to the repository root. In Vercel Project Settings → Environment Variables, configure `NODE_ENV=production`, `DEMO_MODE=false`, the exact HTTPS production `APP_ORIGIN`, and the secret `DATABASE_URL`/`DIRECT_URL` values for Supabase (same requirements as above). Apply the Supabase migrations before testing. Verify `https://<your-vercel-domain>/api/health`; API auth will reject writes if `APP_ORIGIN` does not exactly match the public origin. Preview deployment domains need their own exact `APP_ORIGIN` in the Preview environment to use login there. Vercel Functions handle REST; Socket.IO needs a persistent host.

Real rental mutations still require smart-lock/telemetry/payment providers; production operations also need account provisioning, storage/email integrations and operational policy review. The Docker/PostGIS path and Supabase connection have not been runtime-tested in this workspace. Never seed production with the local demo dataset.
