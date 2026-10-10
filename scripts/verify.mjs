import { PrismaClient } from '@prisma/client';
import { booleanPointInPolygon, point } from '@turf/turf';
const db = new PrismaClient({ datasourceUrl: 'file:./velocity.db' });
const territories = await db.territory.findMany();
console.log({
  users: await db.user.count(),
  bikes: await db.bicycle.count(),
  stations: await db.station.count(),
  territories: territories.length,
  routeStartCovered: territories.filter((t) =>
    booleanPointInPolygon(point([69.2702, 41.3118]), t.geometry),
  ).length,
});
const results = await Promise.all(
  ['http://localhost:5173', 'http://localhost:3001/api/health'].map(async (url) => ({
    url,
    status: (await fetch(url)).status,
  })),
);
console.log(results);
await db.$disconnect();
