# Windows and VS Code setup

Install Node.js 24 LTS, open `C:\Users\lenovo\Desktop\startup` in VS Code, then open Terminal → New Terminal. Use `npm.cmd` in PowerShell to avoid npm.ps1 execution-policy restrictions.

```powershell
npm.cmd ci
# Only if .env is absent:
Copy-Item .env.example .env
npm.cmd run setup
npm.cmd run dev
```

Open `http://localhost:5173`; API health is `http://localhost:3001/api/health`. Use localhost to match APP_ORIGIN. Separate terminals can run `npm.cmd run dev:web` and `npm.cmd run dev:api`. Stop servers with Ctrl+C. VS Code tasks/extensions/settings are supplied.

## Environment

DATABASE_URL defaults to `file:./velocity.db`, relative to the Prisma schema. PORT=3001, APP_ORIGIN=http://localhost:5173, DEMO_MODE=true, NODE_ENV=development. DEMO_USER_PASSWORD/DEMO_ADMIN_PASSWORD/DEMO_BUSINESS_PASSWORD configure empty-database seed accounts. Changing these after seeding does not alter stored passwords. HOST optionally changes API binding; TRUST_PROXY=1 is only for a trusted single reverse proxy.

Keep `.env` private. Dependencies/Prisma engine downloads require internet access at installation. Photo/fonts/map worker are local assets. External street tiles have a labeled schematic fallback. No real payment credentials or map token are needed.

## Verification

Run `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`. With servers running, execute `npm.cmd run test:e2e`. Installed Chrome/Edge is selected automatically; otherwise use `npx.cmd playwright install chromium`. Browser tests modify the demo and save screenshots under `docs/screenshots`; API tests only rebuild isolated test.db.

To repeat a presentation from baseline, stop servers, run `npm.cmd run demo:new`, set its printed file URL in `.env` and restart. Existing databases are preserved.

## Privileged account provisioning

Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in the local operator terminal environment, then run `npm.cmd run admin:provision`. Use a separate email and a password of at least 16 characters. The command creates a new SUPER_ADMIN account, refuses an existing email and writes an audit event without printing credentials. Remove these environment variables afterward. Ordinary admin demo credentials retain their existing role. Provisioning is provided but has not been executed against this demo database.

## Troubleshooting

- Permit dependency/Prisma downloads and rerun setup after a network restriction.
- Windows sandbox `uv_os_get_passwd ENOMEM` means restricted process identity prevented tsx startup; use the normal VS Code terminal.
- Stop API/database viewers before migration if SQLite reports database locked.
- API watch mode checks API/shared file contents each second, so database writes, browser artifacts and spurious Windows notifications cannot restart it.
- Origin/CSRF errors: use the exact configured hostname/port and refresh/sign in again.
- If WebGL is unavailable, the station list remains usable. Camera/location permissions are optional.
