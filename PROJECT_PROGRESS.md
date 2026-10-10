# VELOCITY development handoff

Updated: 10 October 2026, backend integrity continuation (Asia/Tashkent).

## Resume context

Continue the existing React/TypeScript + Express/Prisma npm workspace at `C:\Users\lenovo\Desktop\startup`. Do not replace working modules. Original requirements: `C:\Users\lenovo\.codex\attachments\d3c8ad46-0dc0-4649-9caf-95b9a97514e5\Pasted text.txt`.

The user requests autonomous completion, minimal explanations/tool calls, targeted tests, retained professional responsive design, and no removal of planned features. No subagents are authorized.

## Current continuation: development-origin authentication

The source of `Invalid request origin.` was exact comparison against `APP_ORIGIN=http://localhost:5173`, which rejected requests from the equally local `http://127.0.0.1:5173`. `apps/api/src/origins.ts` now allows exactly those two HTTP origins in non-production. Production still allows only configured HTTPS `APP_ORIGIN`; CORS uses credentialed exact allowlisting for HTTP and Socket.IO, and mutation Origin plus session CSRF validation stay enabled. Frontend uses relative `/api` calls with `credentials: include` through the Vite proxy. Cookies remain HttpOnly, SameSite=Lax, host-only and Secure in production.

Logout no longer invalidates protected queries after destroying the session; it cancels queries, clears the CSRF token and cache, then navigates out. Live browser testing found and verified this avoids post-logout 401 console noise.

The requested servers were restarted. They are serving `http://127.0.0.1:5173` (web) and `127.0.0.1:3001` (API); `/api/health` and the web root return 200. Auth smoke test through the actual 127.0.0.1 proxy passed signup 201, login 200, dashboard 200, missing-CSRF 403, logout 200, protected route after logout 401, both allowed origins, and an evil-origin CORS rejection. Browser signup/login/dashboard/logout completed with zero console or network errors. Temporary smoke users were removed.

## Verified baseline

- Rider: preserved full rental flow plus captured pass discounts, avatars/local email verification, notification preferences, contact inbox, healthy weekly activity/goal streaks with recovery weeks and ten trusted achievement rules.
- Community: transactional friendship decisions/fixed mutation endpoints, public achievement profiles, paginated global/district/distance/influence/mission/team/friends standings, consent-based invitations, registered team competitions, season finalization/championship history and territory event history/pagination/levels.
- Admin: preserved fleet/station operations; added teams/rewards/territory/season/battle/user/rules/plans/feedback/sponsor controls, mission editing/scheduling/difficulty/eligibility, technician/priority/service notes, eight total CSV datasets and statistical demand baseline.
- Business: scoped campaign-window aggregates, consent-based organization invitations, own sponsor profile submissions, administrator approval and sponsored mission drafts/publication.
- UI: responsive branded public/rider/admin/business layouts, local fonts, light/dark preferences, core Uzbek/English/Russian translations.
- Infrastructure: durable SQLite with eight applied additive migrations and 41 models; generated PostgreSQL/PostGIS schema includes the new fields. Docker/nginx configs and updated documentation are present. Existing records preserved.
- Final checks: strict TypeScript, production build and lint passed. All 31 tests passed (28 API + 3 healthy-consistency tests), including both dev origins, CSRF, protected sessions and logout. The four prior browser scenarios passed; current live signup/login/dashboard/logout passed at 127.0.0.1 with no browser errors. Mobile mission overflow is fixed and verified. Build retains large main/MapLibre bundle warnings; wider performance optimization remains.
- Final database verification: Prisma schema diff reported no difference; SQLite foreign_key_check returned no violations. No public site was deployed.

## Current development priorities

1. Complete remaining local targets: private friend challenges, moderated territory naming/flags/profile cosmetics, empire progression/decay and deeper passport collections.
2. Complete mission templates/recurrence, team-event mission types and richer curated route variants/recommendation providers.
3. Add corporate invoicing and wider admin pagination.
4. Expand pagination/filtering, full secondary-page translations, accessibility/performance and device QA.
5. Validate provisioned SUPER_ADMIN flow and cross-process PostgreSQL concurrency. Real integrations/deployment require external services.

## Continuation implementation details

- New API domain modules: `competition.ts`, `progression.ts`, `missions.ts`, `standings.ts`, `intelligence.ts`; routers `operations.ts`, `engagement.ts`, `sponsors.ts`.
- Immutable TerritoryContribution records reference completed rentals; MissionExploration tracks distinct territory visits; MissionVisit tracks distinct days/districts. Exact influence split, configured cooldown and daily caps are enforced server-side. Ownership changes are recorded and privacy-masked in public history.
- Seasons preserve lifetime XP, freeze influence results once, and allow non-overlapping future schedules. The server timer and relevant requests finalize expired events. Battles have selected teams, date windows, DISTANCE/INFLUENCE scoring from trusted rentals, immutable BattleScore records, frozen ranks and exactly-once winning-contributor points/achievement awards. Team changes are blocked during an active ride/current-team battle.
- Mission engine supports RIDES, DISTANCE, EXPLORATION, DURATION, INFLUENCE, ROUTE, DISTRICTS, ACTIVE_DAYS and MISSIONS. XP/team eligibility is checked at join; district/start-hour criteria are checked at completion. Sponsor approval/windows gate availability and progression. Editing joined missions preserves requirements, rewards, eligibility, sponsor and start time. Completion-milestone counts use joinedAt; old seeded joins use mission start.
- Ten achievements: first ride, 10/100 km, three landmarks, ten contributed territories, five missions, winning battle contribution, four active weeks, early adopter and seasonal champion. Recognition is cosmetic and does not multiply scoring. Streaks use Monday calendar weeks in UTC+5. Current incomplete weeks preserve last week’s run; explicit recovery weeks bridge gaps without adding activity. Goal streaks disclose comparison against the current goal.
- Leaderboard legacy array response is preserved; `format=paged` supplies 50-entry metadata, metric/period/scope/district filters and basis. Private/suspended profiles are excluded. Public profiles expose only name/XP/team/achievements. District ride scoring uses return stations; mission standings span all districts; period influence uses contribution history.
- Pass purchases use demo-wallet atomic debit, UUID idempotency, captured price/discount and no automatic renewal. Cancellation ends immediately without refund. Reservation snapshots the active pass’s minute discount. Admin rule changes do not alter existing reservations.
- User suspension/role changes revoke sessions and sockets. Only SUPER_ADMIN grants roles/manages privileged users; self-modification is blocked. `npm.cmd run admin:provision` creates a separate audited SUPER_ADMIN using ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD (16+ characters). Command supplied, not executed on the demo database.
- Organization membership changes now require invitation acceptance. New reservations snapshot organization membership within the rental transaction; completed campaign totals use that immutable snapshot and date window. Pre-migration rentals stay unattributed instead of guessing from current membership. Sponsor profiles and missions are scoped to the business organization; sponsored drafts require administrator publication. Demo profiles explicitly disclaim commercial agreements.
- Friendships now use a normalized, length-prefixed unordered-pair key with a database unique index. Migration 007 removes any legacy reverse-direction duplicates in favor of accepted/earlier requests; concurrent duplicate or reverse requests return a conflict.
- Sponsors can create inventory only for active approved campaigns. The organization-scoped business API reports stock/redemption counts, supports guarded stock updates and snapshots sponsor attribution on redemptions. Migration 008 is applied and covered by isolated tests.
- Maintenance metadata and idle-bike service transition are transactional/audited; active bikes are protected. CSV datasets: rentals/inventory/stations/missions/territories/rewards/revenue/activity. New exports quote cells and protect formula injection. Demand intelligence is a transparent 28-day statistical station-return proxy, not a trained ML prediction.
- New web modules: admin Controls/Intelligence, account Extras, public Contact, business Sponsors, community PublicProfile. Existing working pages were extended. Previously planned operational/contact/billing routes now have local workflows. Socket client loads only after authentication. Calendar form values now respect device timezone. Long mission filter rows scroll within their container on mobile.

## Migration recovery and data preservation

Migration 003 generated by Prisma contained malformed SQLite JSON default syntax and failed at the new User table. The one-time `scripts/recover-competition-migration.mjs` checkpointed/backed up the DB, applied only the remaining migration transactionally, checked all 255 accounts and foreign keys, then migration 003 was marked applied. Backup: `prisma/velocity-before-competition-recovery-1791649068748.db` (ignored, preserve). Do not rerun recovery on the migrated database.

Migrations 004 identity/billing, 005 mission/sponsors, 006 mission join time, 007 friend-pair integrity/rental organization attribution and 008 sponsor reward inventory are applied. Migration 007 leaves historical organization IDs null because membership at ride time cannot be reconstructed. PostgreSQL preparation normalizes JSON defaults. The prepared PostgreSQL initial migration is undeployed; applied SQLite migration history must remain untouched.

## Test and preview lessons

- `vitest.config.ts` now includes `tests/*.test.ts`, running both API and healthy-consistency tests. Tests rebuild isolated test.db only.
- Four browser scenarios cover controls/contact/passes/verification/leaderboards/public profiles, full ride/rewards/mobile, admin mission edit/fleet/investor/business, and business sponsor approval/publication/mobile.
- Use accessible-role selectors for exact select/textarea names: nested option/textarea text can prevent exact getByLabel matching.
- Select an idle fleet row for editing; earlier interrupted browser rides left legitimately IN_USE bikes. Do not bypass this protection or reset accounts/data.
- Hold API/shared source steady during browser tests; watch restarts can interrupt requests. Several exploratory failed runs were corrected rather than hidden. The rider and admin scenarios passed after fixes.
- Windows dev processes were observed reopening from VS Code terminals between migrations. Identify exact current workspace command lines and stop their npm/concurrently/watch/API children before Prisma generation. Do not terminate VS Code/terminal parents or unrelated processes.

## Remaining external verification

### Vercel production diagnosis (2026-10-11)

- Vercel browser login is now authorized as `miruyem13-6964`, scope `alset`. Checkout linked to existing `velocity` project; no duplicate created. `.vercel` and `.env*` are ignored. CLI link wrote ignored `.env.local` (OIDC only); never commit or print it.
- Production deployment `dpl_87yzEzyLiDrvtuChizR3ParJVGns` (`velocity-kf5hnmg14-alset.vercel.app`, canonical `velocity-eight-dun.vercel.app`) is Ready with bundled `api/index` function. Live session/health now return structured JSON 503, and actual runtime logs confirm `Production requires an explicit DATABASE_URL`; the module-resolution failure is resolved in this deployment.
- `vercel env ls production` initially showed zero configured variables. Added non-secret `APP_ORIGIN=https://velocity-eight-dun.vercel.app`, `DEMO_MODE=false`, and `NODE_ENV=production`. They take effect on the next deployment. User confirmed no Supabase project exists and needs setup instructions. Real blocker: user must create Supabase and privately configure Production DATABASE_URL (transaction pooler) and DIRECT_URL (session pooler). Then pull Production env securely, apply checked-in PostgreSQL migrations, provision admin securely, deploy existing project, and verify live auth/catalog/protected endpoints. Do not replace PostgreSQL with temporary SQLite or fabricate credentials.

- GitHub main commit `93d80c2` is deployed as Production/Ready per the user's Vercel screenshot.
- A live unauthenticated GET to `https://velocity-eight-dun.vercel.app/api/session` returned HTTP 500, text/plain, `X-Vercel-Error: FUNCTION_INVOCATION_FAILED`. Routing now reaches a function, but runtime initialization/invocation fails. Homepage map error is an API failure, not a missing image.
- User-provided runtime logs confirmed `ERR_MODULE_NOT_FOUND` for `/var/task/apps/api/src/app` imported by `/var/task/api/index.js`. All relative imports in the API entrypoint/backend now use explicit `.js` extensions for native Node ESM after TypeScript compilation, including shared schema imports. No business logic or security checks changed.
- Added `tests/vercel-runtime.test.ts`: transpiles the complete backend dependency graph to JavaScript, launches native Node (no tsx/Vite loader) in production mode, checks the rewritten anonymous session and rejection of untrusted registration origins. Both routing/runtime test files passed (5 tests). This smoke test deliberately performs no DB connection; cloud persistence is still unverified. Existing CLI credentials are invalid.
- `apps/api/src/db.ts` intentionally rejects missing/non-PostgreSQL production DATABASE_URL. Check Production environment variables and Prisma packaging/runtime imports using the actual exception before changing code. Real Supabase credentials/migrations remain unverified.
- Follow-up packaging: `api/index.js` is a CommonJS wrapper (scoped by `api/package.json`), and `scripts/vercel-build.mjs` builds the frontend/PostgreSQL client then bundles `apps/api/src/vercel.ts` into ignored `.vercel-backend/handler.cjs`. esbuild is a direct dev dependency. Vercel explicitly includes the bundle and generated Prisma engine/client files, removing reliance on tracing/transpiling individual local TypeScript modules.
- The wrapper preserves origin/CSRF checks and returns safe JSON 503 on initialization failures, with details restricted to server logs. No fallback database or mock catalog is introduced. Bundled native Node smoke verifies session JSON, origin rejection, and missing-database handling. Three targeted test files passed (6 tests); frontend build/typecheck passed. CLI has no valid connected account and production database configuration remains inaccessible; live verification is still required.
- Full `npm.cmd run vercel:build` passed, including PostgreSQL Prisma generation and the 1.8 MB backend CommonJS bundle. The 6 targeted tests also passed against the generated PostgreSQL client. Local Prisma client was restored with `npm.cmd run db:generate` afterward. The existing project API watcher/server was stopped to release a Windows Prisma DLL lock during generation; restart development servers afterward.

PostgreSQL/PostGIS runtime, containers and public deployment remain untested; Docker/PostgreSQL were unavailable at baseline. Real hardware, external email/payment provider delivery, native background GPS and push require integrations. Explicit demo adapters must remain labeled; never claim real integrations work.

## Commands and constraints

Use `npm.cmd` on PowerShell. `npm.cmd run setup` generates/migrates/seeds without deleting existing data. Stop owned API processes before generating Prisma on Windows (DLL lock). `npm.cmd run dev` serves web at localhost:5173 and API at localhost:3001. Use exact localhost origin. Tests use isolated prisma/test.db; browser tests mutate demo data. `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run test:e2e` are established checks.

The API watcher polls source contents (`scripts/dev-api.mjs`) to avoid spurious Windows filesystem restarts. The tool runner can leave Windows child processes after Ctrl+C: identify exact owned command lines before stopping them. Do not kill unrelated processes or rewrite migration history of an applied database. PostgreSQL prepared initial migration is not yet deployed.

See `docs/FEATURE_STATUS.md` for acceptance results and detailed gaps. Update this file and the status document after each verified increment.
