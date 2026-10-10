# API reference

All paths start with `/api`; development base URL is `http://localhost:3001`. Browser calls use the same-origin Vite proxy. JSON errors return `{ "message": "..." }` with 401/403/404/409/422 or generic 500 status. Mutations require APP_ORIGIN. Authenticated mutations require the `X-CSRF-Token` returned by session/sign-in. Session secrets use HTTP-only cookies.

| Method     | Path                           | Behavior/access                                                                                              |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| GET        | /health, /session              | Database health; sanitized viewer/CSRF                                                                       |
| POST       | /auth/register, /auth/login    | Validated credentials; registration role always USER                                                         |
| POST       | /auth/demo                     | Development-only rider session                                                                               |
| POST       | /auth/logout                   | Revoke current session                                                                                       |
| POST       | /auth/forgot, /auth/reset      | Local reset adapter; single-use token; no email delivery                                                     |
| GET        | /catalog                       | Public fleet, stations, territories, missions, season, teams, landmarks, rewards and totals                  |
| GET        | /dashboard?days=7              | Own metrics, chart, active rental, 20 recent rides, missions, stamps, achievements, wallet and notifications |
| PATCH      | /profile                       | Own name/weeklyGoal/publicProfile                                                                            |
| POST       | /rentals/reserve               | bikeId; availability and active-rental protection                                                            |
| POST       | /rentals/:id/cancel            | Own reservation cancellation                                                                                 |
| POST       | /rentals/:id/unlock            | code; ownership/expiry/bike identification                                                                   |
| POST       | /rentals/:id/advance           | step; duplicate-protected deterministic simulation                                                           |
| POST       | /rentals/:id/pause             | paused boolean; persistent simulation control                                                                |
| POST       | /rentals/:id/finish            | stationId; parking/balance validation and idempotent awards                                                  |
| POST       | /missions/:id/join             | Join a published, unexpired mission                                                                          |
| GET        | /leaderboard                   | Public standings with metric/period/district/scope/page filters; format=paged returns metadata               |
| POST       | /teams/:id/join, /teams/leave  | Own single team membership                                                                                   |
| GET/POST   | /friends, /friends/requests    | List connections/suggestions and send a request to a public rider                                            |
| PATCH      | /friends/requests/:id          | Addressee accepts or declines a pending request                                                              |
| DELETE     | /friends/:id                   | Either participant removes a request or connection                                                           |
| POST       | /rewards/:id/redeem            | UUID key; spend points and stock atomically                                                                  |
| POST       | /wallet/topup                  | amount/UUID key; development-only credit                                                                     |
| POST       | /notifications/read            | Own read states                                                                                              |
| POST       | /bikes/:id/report              | description; persistent rider report connected to maintenance operations                                     |
| GET        | /admin/analytics?days=30       | Role-protected metrics/charts/issues/audits                                                                  |
| GET        | /admin/users?q=                | Up to 100 matching name/email/role summaries; no hashes/GPS                                                  |
| POST/PATCH | /admin/bikes[/:id]             | Audited fleet create/edit; no active-bike editing                                                            |
| DELETE     | /admin/bikes/:id               | Audited soft archive; active bicycles protected                                                              |
| POST/PATCH | /admin/stations[/:id]          | Geometry, district, docking capacity                                                                         |
| DELETE     | /admin/stations/:id            | Audited soft archive; active bicycles protected                                                              |
| GET/POST   | /admin/missions                | List/create validated missions                                                                               |
| PATCH      | /admin/missions/:id/status     | Audited DRAFT/PUBLISHED/PAUSED                                                                               |
| DELETE     | /admin/missions/:id            | Audited mission archive that retains participation history                                                   |
| POST       | /admin/maintenance/:id/resolve | Close issue and audit                                                                                        |
| GET        | /admin/reports/rentals.csv     | Up to 10,000 completed rows; excludes identities/GPS                                                         |
| GET        | /business/overview             | Own organization aggregate totals/challenges                                                                 |
| POST       | /business/challenges           | Own organization name/targetKm/endsAt                                                                        |
| GET/POST   | /business/employees            | List members or invite an eligible rider by email; acceptance required                                       |
| DELETE     | /business/employees/:id        | Remove a rider from the caller's organization; self-removal blocked                                          |

Reserve example: `{ "bikeId": "bike-0" }`. Unlock: `{ "code": "V-001" }`. Advance: `{ "step": 0 }`. Clients cannot submit distance, XP, money or scores. Development email/password reset returns a local token; production has no email delivery integration and never exposes reset tokens.

Socket.IO handshakes require an active account, session cookie and auth.csrf token. Refresh events carry only timestamps; clients fetch authorized data. Connections expire with the session. User rooms support immediate revocation on logout, reset and access changes.

## Added operational and community routes

| Method         | Path                                                        | Behavior/access                                                             |
| -------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| GET            | /profiles/:id                                               | Authenticated public-profile summary; private/suspended accounts return 404 |
| GET            | /territories/:id/history                                    | Privacy-masked season leaders, contributions and ownership events           |
| GET            | /battles, /seasons                                          | Published competitions and frozen historical standings                      |
| POST           | /teams/:id/invite                                           | Current team member sends a consent-based invitation                        |
| GET/POST       | /invitations, /invitations/:id/respond                      | Own pending invitations; accept boolean                                     |
| PATCH          | /notifications/preferences                                  | Own community/marketing preferences                                         |
| POST           | /profile/recovery-week                                      | resting boolean; preserve streaks without adding activity                   |
| PATCH          | /profile/avatar                                             | Bounded PNG/JPEG/WebP data URI or null                                      |
| POST           | /auth/verification/request, /auth/verification/confirm      | Demo-only hashed single-use local verification token                        |
| POST           | /contact                                                    | Rate-limited public message saved in the local admin inbox                  |
| GET/PATCH      | /admin/feedback[/:id]                                       | Review local messages; OPEN/CLOSED status                                   |
| GET            | /plans, /subscriptions                                      | Available demo plans and own purchased-pass history                         |
| POST           | /subscriptions, /subscriptions/:id/cancel                   | UUID-idempotent wallet purchase; cancellation without refund                |
| GET/PATCH      | /admin/plans[/:id]                                          | Edit future plan terms; purchases retain captured terms                     |
| GET/POST/PATCH | /admin/teams, /admin/rewards                                | Audited configuration; PATCH uses /:id                                      |
| GET/PATCH      | /admin/territories[/:id]                                    | Enabled state/metadata; retain geometry/history                             |
| GET/POST       | /admin/seasons, /admin/challenges                           | Schedule seasons or selected-team competitions                              |
| POST           | /admin/seasons/:id/close                                    | Freeze standings; preserve lifetime XP                                      |
| POST           | /admin/challenges/:id/activate, /admin/challenges/:id/close | Activate/finalize battles; awards once                                      |
| PATCH          | /admin/users/:id                                            | Rider status; SUPER_ADMIN role grants; session/socket revocation            |
| GET/PATCH      | /admin/settings                                             | Pricing, XP/influence caps and cooldown rules                               |
| PATCH          | /admin/missions/:id                                         | Edit; joined requirements/rewards/eligibility/start protected               |
| PATCH          | /admin/maintenance/:id                                      | Priority, technician, notes, status; protected idle-bike transition         |
| GET            | /admin/intelligence                                         | 28-day statistical station return-history baseline                          |
| GET            | /admin/reports/:dataset.csv                                 | Inventory/stations/missions/territories/rewards/revenue/activity            |
| GET/PATCH      | /admin/sponsors[/:id]                                       | Review demonstration sponsor status                                         |
| GET/POST       | /business/sponsors                                          | Own organization profiles/submissions                                       |
| POST           | /business/sponsored-missions                                | Own approved sponsor only; create DRAFT for admin publication               |

Leaderboard metric: XP, DISTANCE, INFLUENCE, MISSIONS, TEAMS. Period: ALL, WEEK, MONTH. Scope: GLOBAL or authenticated FRIENDS. Paged responses contain 50 entries, total/page/pageSize and a disclosed scoring basis. Calendar filters use Tashkent time. Influence views use the current season; period filters use contribution events.

Mission requirements: RIDES, DISTANCE (meters), EXPLORATION (distinct territories), DURATION (seconds), INFLUENCE, ROUTE (complete demo loops), DISTRICTS, ACTIVE_DAYS and MISSIONS. Optional eligibility includes minimum/maximum XP, team membership, district and a same-day Tashkent start-hour window. Difficulty: EASY/MEDIUM/HARD. Approved sponsor dates must cover the mission window. Progression comes from server events.
