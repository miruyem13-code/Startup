# Architecture

An npm workspace monorepo separates the React interface, Express API, reusable UI and shared schemas. The browser never accesses the database directly. Prisma/SQLite is the authoritative local store. Requests flow through the typed client, same-origin Vite proxy, authentication/Origin/CSRF middleware, Zod validation and transactional domain service.

TanStack Query refreshes data after mutations. Authenticated Socket.IO connections receive data-free refresh events, never client-originated score commands or private route broadcasts. Web feature groups load lazily; MapLibre/Recharts have separate bundles.

## Rental lifecycle

Bicycle states: AVAILABLE → RESERVED → IN_USE → AVAILABLE. Reservations expire after 10 minutes, and cancellation releases the bike. MAINTENANCE/OFFLINE bikes cannot be reserved. Admin edits cannot change active bikes. Conditional updates and locally serialized write transactions protect reservations. Simulation steps require the expected index; duplicates are rejected.

Completion atomically persists price, XP, joined mission progress, territory influence, stamps, achievements and the wallet debit. Repeated completion returns the already-completed record without repeating awards. Current simulated rides start/end at Amir Temur Square. Each step adds 90 seconds. Progress/pause state survives reloads. `LockAdapter`/`DemoLock` establish the hardware boundary; real hardware is not connected.

## Scoring

Default ride XP: 10 per whole 100 m, capped at a 1,000-XP daily pool. Default influence: 1 per whole 100 m, capped at a 100-point daily pool, split exactly between eligible enabled polygons, with a 30-minute repeated-territory cooldown. Admin rules configure these limits. Daily caps use UTC midnight. Only an active season within its dates receives influence. Immutable contribution and ownership events retain history. Influence is virtual and seasonal.

Joined missions evaluate trusted completed ride events and award once. Requirements cover rides, distance, duration, distinct territories, distinct districts, separate active days, influence, full demo loops and completed missions. Difficulty, XP/team eligibility, district and Tashkent start-hour criteria are validated. Joined missions retain requirements, rewards, eligibility and start time. Sponsor status/date windows gate availability and scoring. Mission completion milestones use the captured join time; historical joins fall back to their mission start.

Levels use `1 + floor(lifetime XP / 1000)`; cosmetic achievements give no permanent scoring advantage. Ten achievement rules are evaluated through trusted rides and competition finalization. Calendar activity/goal streaks start Monday in Tashkent. Recovery weeks preserve previous runs without adding fictional activity; daily riding is never required. Goal streaks compare historical distances with the current goal and explicitly disclose this basis.

Registered battles capture trusted rental contributions for selected teams and explicit date windows. Finalization freezes ranks and awards winning contributors once. Season closure freezes influence standings without changing XP; scheduled seasons start with separate score records. A server maintenance timer and relevant requests finalize expired events. SQLite writes are serialized locally; PostgreSQL deployment still requires distributed-concurrency validation.

## Map

Attributed OpenStreetMap raster tiles supply online streets. Labeled local schematic corridors underneath are demonstration geometry, not geographic street or safe-route data. Tile failure cannot block station markers, valid territory hexagons or the demo route. Inventory is located at stations. Available-count markers and a clustered station GeoJSON layer represent it.

MapLibre 6’s module worker is an explicit Vite URL asset. A specific `.map-canvas.maplibregl-map` CSS rule prevents late map styling from clipping the canvas. Instances are resized with ResizeObserver and destroyed on unmount.

## Expansion

PostgreSQL preparation adds PostGIS polygons/GiST indexing and partial active-rental unique indexes. Current polygon evaluation uses Turf. Native PostGIS queries, distributed transaction retries/event routing, influence decay, wider pagination and real provider adapters remain future work. Leaderboards and territory grids are paginated; demand intelligence is an explicitly labeled statistical return-history baseline with a provider boundary.
