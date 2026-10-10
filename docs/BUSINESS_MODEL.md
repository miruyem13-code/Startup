# Business model

Potential revenue: rental usage, optional passes, sponsored missions and corporate programs. Only demo per-ride pricing and aggregate organization challenges are implemented. Subscriptions, signed sponsorships, real vouchers and payment settlement remain planned.

Pricing: 2,000 UZS unlock + 400 UZS per started minute, stored as integers. Loyalty credit is simulated. Territory influence cannot be purchased; no paid competitive advantage exists.

## Investor model

Monthly modeled revenue = bicycles × rides per bike/day × 30 × (unlock fee + minute rate × average minutes).

Costs = bicycles × monthly maintenance + logistics + modeled processing fees. Contribution = revenue − costs. Acquisition payback = fleet acquisition cost / positive monthly contribution. Negative contribution has no payback result.

Conservative/base/optimistic scenarios use 1.5/3/5 rides per bike/day. Assumptions are editable and browser-local. Pricing is a fixed disclosed assumption, not admin-configurable pricing. Model outputs never enter operational analytics. Excluded: tax, insurance, refunds, depreciation, acquisition costs for customers, financing, losses and working capital. These are illustrative scenarios, not forecasts or guaranteed returns.

Calories assume 30 kcal/km. CO₂ assumes 0.16 kg/km and replacement of a car trip. Neither is measured health or environmental impact. Employers receive aggregate distance/participation, not individual health estimates/routes.

## References and assets

The locally saved bicycle photo is [Unsplash photo 1485965120184-e220f721d03e](https://images.unsplash.com/photo-1485965120184-e220f721d03e). Local font packages include their licenses. Logo/dashboard SVG are original. Street tiles credit [OpenStreetMap](https://www.openstreetmap.org/copyright).

Implementation references: [Prisma 6 SQLite connector](https://www.prisma.io/docs/orm/v6/overview/databases/sqlite), [MapLibre GeoJSON source](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/).
