# Local demo

All bicycles, payments, vouchers, organizations, partners and ride activity are simulated. No physical lock is connected. Browser testing adds actual persistent demo records.

## Development-only accounts

| Role     | Email                  | Default local password |
| -------- | ---------------------- | ---------------------- |
| Rider    | rider@velocity.demo    | VelocityDemo2026!      |
| Admin    | admin@velocity.demo    | VelocityAdmin2026!     |
| Business | business@velocity.demo | VelocityBusiness2026!  |

Values match `.env.example`; use customized seed values if changed. Changing an environment password after seeding does not update the stored hash. These credentials appear only in local documentation/configuration, not in the application. Never deploy them publicly. The demo sign-in button authenticates only the rider.

## Journey

1. Open http://localhost:5173 and explore the map.
2. Sign in with the demo rider button and inspect backend-derived dashboard metrics.
3. Join missions before riding; three missions are already joined for the seeded rider.
4. Reserve an available bicycle at **Amir Temur Square**.
5. Enter its code, for example V-001, to simulate unlocking. Camera QR detection is browser-dependent; manual entry remains available.
6. Advance 18 simulation steps, representing 27 minutes. Pause/resume/reload preserves backend progress.
7. Finish at Amir Temur Square. Parking/capacity/balance are checked.
8. Inspect XP, mission completion, seasonal influence, leaderboard, passport stamps and the first-ride achievement.
9. Redeem loyalty ride credit and inspect saved redemption/wallet history. XP and redeemable points are separate.

Add demo wallet credit if needed; no real payment is taken. Other stations can be discovered/reserved, but only Amir Temur Square supports the current simulated unlock loop. Cancel any non-starting-station reservation before choosing a starting bike.

Sign out and log in as admin to inspect the new rental, edit a non-active bike, create/publish a mission, view audits and export CSV. Mission publication appears immediately in the rider/public challenge pages. Investor inputs affect illustrative scenarios only, never operating revenue.

Sign in as business admin for organization-scoped aggregate participation/distance and challenge creation. Challenge progress currently uses all-time organization distance; campaign-window attribution, employee invitations and billing remain planned.

For a clean repeat, stop servers and run `npm.cmd run demo:new`. Set its printed DATABASE_URL in `.env` and restart. It creates a separate seeded database and preserves all old databases.
