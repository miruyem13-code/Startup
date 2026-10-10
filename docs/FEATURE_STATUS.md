# VELOCITY 0.1 release status

This is a verified local pilot, not the complete VELOCITY 3.0 target. Verification date: **10 October 2026**. All operational/financial data is simulated. SQLite is the verified persistence adapter; PostgreSQL/PostGIS infrastructure is prepared but untested at runtime.

## Acceptance criteria

| Criterion                | Status   | Evidence / limit                                                                                                                              |
| ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend starts          | VERIFIED | Local HTTP 200 and Playwright pages                                                                                                           |
| Backend starts           | VERIFIED | API health HTTP 200                                                                                                                           |
| Database connects        | VERIFIED | Prisma/SQLite health query and persistent reads/writes                                                                                        |
| Migrations run           | VERIFIED | Eight additive migrations applied; schema diff is empty and SQLite foreign-key check is clean                                              |
| Seed works               | VERIFIED | 250 riders, 120 bikes, 18 stations, 80 hexagons, 40 missions, 1,120 rides                                                                     |
| Authentication works     | VERIFIED | API login/register checks and browser rider/admin/business sessions                                                                           |
| Dashboard works          | VERIFIED | Database-derived aggregates/chart and browser screenshot                                                                                      |
| Interactive map works    | VERIFIED | MapLibre canvas, visible coordinate markers, polygons and route inspected; offline schematic fallback. Online OSM tile success NOT YET TESTED |
| Reservation works        | VERIFIED | Competing requests yield one success/one conflict; browser reservation                                                                        |
| Simulated rental works   | VERIFIED | 18 browser steps, pause/resume API, parking and saved summary                                                                                 |
| Mission completion works | VERIFIED | Trusted ride events complete joined requirements once                                                                                         |
| Territory scoring works  | VERIFIED | Enabled touched polygons receive active-season influence                                                                                      |
| Leaderboard updates      | VERIFIED | API checks earned XP standings                                                                                                                |
| Rewards persistent       | VERIFIED | Transaction/idempotency tests and browser redemption history                                                                                  |
| Admin login              | VERIFIED | Browser sign-in                                                                                                                               |
| Admin protection         | VERIFIED | API 401/403, browser role restrictions                                                                                                        |
| Admin CRUD               | VERIFIED | Bike/station create, edit and audited soft-archive; mission create, publish, pause and archive are API-tested                                 |
| Admin analytics from DB  | VERIFIED | Test asserts completed ride/revenue totals; browser overview                                                                                  |
| Business demo            | VERIFIED | Organization API isolation, browser totals, challenge creation API                                                                            |
| Investor overview        | VERIFIED | Browser scenario inputs and rendered outputs                                                                                                  |
| Mobile layouts           | VERIFIED | 390×844 dashboard, bottom navigation and no horizontal overflow; physical-device QA NOT YET TESTED                                            |
| Builds succeed           | VERIFIED | Strict TypeScript and Vite build                                                                                                              |
| Critical tests pass      | VERIFIED | 28 API tests, 3 consistency tests, 4 browser scenarios and live 127.0.0.1 signup/login/logout smoke with no console/network errors            |
| Documentation complete   | VERIFIED | All eleven requested documentation files supplied                                                                                             |

Migration 008 adds sponsor reward ownership and immutable sponsor-at-redemption attribution. All eight migrations are applied to the preserved SQLite database. PostgreSQL/PostGIS connection, migrations, containers and public hosting: **NOT YET TESTED**. Camera recognition and native geolocation permission behavior: **NOT YET TESTED**. These are not presented as verified integrations.

## Implemented

Responsive branded landing/public pages; auth/session/reset adapter; role-protected workspaces; original SVG brand; shared UI/form validation; database-backed dashboard/fitness; map and station discovery; reservations/expiry/cancellation; virtual unlock; deterministic persistent ride controls; transactional pricing/wallet/XP/mission/influence/stamp/achievement awards; XP leaderboard; single team membership; seasonal overview; persistent reward inventory/redemption; wallet credits/history; profile/weekly goals/privacy; notifications/read states; curated demo loop; admin fleet/stations/mission management; audit/issue queue/report CSV; organization-scoped totals/challenges; investor assumptions/scenarios; local dark/light themes and core Uzbek/English/Russian strings.

Added: immutable territory contributions and ownership events; anti-farming cooldowns; distinct territory/district/day progression; nine mission requirement types, scheduling, difficulty, eligibility and protected editing; ten trusted achievement rules; weekly activity/goal streaks with recovery weeks; registered team battles and idempotent awards; scheduled seasons and frozen championship results; consent-based team/organization invitations; database-enforced unordered friend-pair uniqueness; filtered paginated leaderboards; privacy-controlled public achievement profiles; demo passes and captured discounts; avatar uploads/local verification; notification preferences; contact/feedback inbox; admin team/reward/territory/season/battle/user/rules/pass/sponsor controls; technician/priority/service notes; seven additional CSV exports; organization-scoped sponsor submission, approval, mission publication, reward inventory and redemption reporting; campaign-window corporate totals attributed to the organization at reservation time; statistical station-demand baseline. Privileged account provisioning is supplied as a local operator command.

## Partial

- Phase A: reusable primitives/layouts/themes and database complete; broader component library and dedicated design tokens can expand.
- Phase B: identity, avatar/local verification, account status and privileged role-management UI implemented; external email delivery and operational provisioning verification remain.
- Phase C: core demo loop complete; current unlock starts only at Amir Temur Square. Real GPS/background tracking/hardware are absent.
- Phase D: mission/scoring engine, distinct exploration, cooldowns, history and scheduled season transitions implemented; influence decay, broader empire strategy/cosmetics and route variants remain.
- Phase E: team invitations, registered battles, seasonal champions, shared profiles, filtered/friends rankings and healthy consistency implemented; private friend challenges, moderated territory naming/flags and deeper passport collections remain.
- Phase F: demonstration wallet/passes, organization campaigns/invitation consent, immutable reservation-time corporate ride attribution, approved sponsor missions and sponsor reward inventory/redemption reporting implemented. Corporate invoicing and real agreements/payment delivery remain.
- Phase G: admin configuration, audited operations, maintenance metadata, reports and provisioning command implemented; broader filtering/pagination, mission templates/recurrence, moderation and complete cross-process transaction hardening remain.
- Phase H: transparent statistical demand baseline, rule-based recommendations, investor model and responsive interface implemented; full secondary-page translation, broader route recommendations/provider integration, performance/accessibility/device QA remain.

Previously planned admin/contact/billing routes now have functional local workflows. Contact messages reach a local inbox; external email is unconnected. Corporate campaigns respect date windows and count only completed rides whose organization was snapshotted at reservation; pre-migration rides remain unattributed because their historical membership cannot be reconstructed. Controlled-territory counts are calculated separately from influenced territories. Weekly streaks allow recovery weeks and use Tashkent calendar boundaries; goal streaks explicitly compare historical distances with the current goal. The demand baseline uses station returns as an activity proxy, not a trained ML dispatch predictor.

## Exact next steps

1. Install Docker/PostgreSQL and follow DEPLOYMENT.md to verify the prepared PostGIS schema/migration and transaction behavior.
2. Complete remaining local target features: private friend challenges, empire cosmetics/moderation, passport collections, mission recurrence/templates and richer routes.
3. Add corporate invoicing and wider admin pagination.
4. Complete secondary-page translations, provider interfaces and broader performance/accessibility QA.
5. Integrate hardware/telemetry/email/payments and validate deployment before a real operational pilot.

Tests leave demo records in the main database; use `npm.cmd run demo:new` for a separate fresh presentation baseline. The complete target is intentionally not marked finished.
