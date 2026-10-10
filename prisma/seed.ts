import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../apps/api/src/security';
import { priceFor } from '../apps/api/src/domain/ride';
import * as turf from '@turf/turf';
import { achievementDefinitions } from '../apps/api/src/domain/progression';
process.env.DATABASE_URL ||= 'file:./velocity.db';
const db = new PrismaClient();
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seeding is forbidden in production.');
const now = new Date();
const ago = (days: number) => new Date(now.getTime() - days * 86400000);
const future = (days: number) => new Date(now.getTime() + days * 86400000);
async function seedSponsor() {
  if (!(await db.organization.count({ where: { id: 'org-0' } }))) return;
  await db.sponsor.upsert({
    where: { id: 'sponsor-demo' },
    create: {
      id: 'sponsor-demo',
      organizationId: 'org-0',
      name: 'Atlas City Week · Demo',
      description:
        'Illustrative city exploration sponsor. No signed commercial agreement or real voucher.',
      color: '#62816a',
      status: 'APPROVED',
      startsAt: ago(1),
      endsAt: future(90),
    },
    update: {},
  });
  await db.mission.updateMany({
    where: { id: 'mission-6', sponsored: true, sponsorId: null },
    data: { sponsorId: 'sponsor-demo' },
  });
}
async function seed() {
  for (const achievement of achievementDefinitions)
    await db.achievement.upsert({ where: { id: achievement.id }, create: achievement, update: {} });
  for (const plan of [
    { id: 'pass-day', name: 'Day Explorer', price: 10000, durationDays: 1, discountPercent: 15 },
    {
      id: 'pass-week',
      name: 'Weekly Momentum',
      price: 40000,
      durationDays: 7,
      discountPercent: 25,
    },
    {
      id: 'pass-month',
      name: 'City Regular',
      price: 100000,
      durationDays: 30,
      discountPercent: 35,
    },
  ])
    await db.pricingPlan.upsert({ where: { id: plan.id }, create: plan, update: {} });
  if (await db.user.count()) {
    await seedSponsor();
    console.log('Database already seeded. Existing records preserved.');
    return;
  }
  const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!demoAdminPassword || demoAdminPassword.length < 16)
    throw new Error('Set a unique DEMO_ADMIN_PASSWORD of at least 16 characters before demo seeding.');
  const stationNames = [
    'Amir Temur Square',
    'Independence Square',
    'Anhor Park',
    'Tashkent City',
    'Minor Mosque',
    'Alisher Navoi Park',
    'Chorsu Bazaar',
    'Eco Park',
    'Mustaqillik Avenue',
    'Museum of Arts',
    'Botanical Garden',
    'Bodomzor',
    'Shaykhontohur',
    'Mirzo Ulugbek Park',
    'Oybek',
    'Yunusabad',
    'Chilanzar',
    'Magic City',
  ];
  const centers = [
    [69.2702, 41.3118],
    [69.2688, 41.321],
    [69.282, 41.3242],
    [69.247, 41.316],
    [69.2785, 41.339],
    [69.247, 41.298],
    [69.235, 41.326],
    [69.295, 41.315],
    [69.2798, 41.3144],
    [69.2852, 41.307],
    [69.312, 41.343],
    [69.288, 41.349],
    [69.253, 41.328],
    [69.324, 41.309],
    [69.278, 41.299],
    [69.284, 41.362],
    [69.219, 41.284],
    [69.242, 41.292],
  ];
  await db.station.createMany({
    data: stationNames.map((name, i) => ({
      id: `station-${i}`,
      name,
      district: ['Yunusabad', 'Mirabad', 'Shaykhontohur'][i % 3],
      lng: centers[i][0],
      lat: centers[i][1],
      capacity: 16,
    })),
  });
  await db.bicycle.createMany({
    data: Array.from({ length: 120 }, (_, i) => ({
      id: `bike-${i}`,
      code: `V-${String(i + 1).padStart(3, '0')}`,
      type: i % 4 === 0 ? 'ELECTRIC' : 'CITY',
      status:
        i > 15 && i % 13 === 0 ? 'MAINTENANCE' : i > 15 && i % 19 === 0 ? 'OFFLINE' : 'AVAILABLE',
      battery: 64 + (i % 37),
      stationId: `station-${i % 18}`,
    })),
  });
  await db.team.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      id: `team-${i}`,
      name: [
        'Green Pedal',
        'Tashkent Explorers',
        'Urban Nomads',
        'Anhor Riders',
        'The Early Birds',
        'City Collective',
        'Weekend Wheels',
        'Navoi Crew',
        'Eco Motion',
        'Silk Road Club',
        'Northside',
        'Pedal People',
      ][i],
      description: 'Explore Tashkent together. Consistency, community, and a little adventure.',
      color: ['#62816a', '#7b86a6', '#bc9868'][i % 3],
    })),
  });
  await db.organization.createMany({
    data: [
      { id: 'org-0', name: 'Atlas Studio · Demo' },
      { id: 'org-1', name: 'Silk Road Technologies · Demo' },
    ],
  });
  await db.season.create({
    data: { id: 'season-1', name: 'Tashkent Rising', startsAt: ago(30), endsAt: future(60) },
  });
  const hash = hashPassword(process.env.DEMO_USER_PASSWORD || 'VelocityDemo2026!');
  const firstNames = [
    'Aziz',
    'Madina',
    'Sardor',
    'Dilnoza',
    'Timur',
    'Malika',
    'Jasur',
    'Nargiza',
    'Bekzod',
    'Shahnoza',
    'Alisher',
    'Sabina',
  ];
  const lastNames = [
    'Karimov',
    'Yusupova',
    'Rahimov',
    'Aliyeva',
    'Tursunov',
    'Saidova',
    'Usmonov',
    'Nazarova',
  ];
  await db.user.createMany({
    data: Array.from({ length: 250 }, (_, i) => ({
      id: `user-${i}`,
      email: i === 0 ? 'rider@velocity.demo' : `rider${i}@velocity.demo`,
      name: `${firstNames[i % 12]} ${lastNames[i % 8]}`,
      passwordHash: hash,
      wallet: 250000,
      points: i === 0 ? 320 : 50 + (i % 300),
      teamId: `team-${i % 12}`,
      organizationId: i < 60 ? `org-${i % 2}` : null,
      createdAt: ago(5 + (i % 80)),
    })),
  });
  await db.user.createMany({
    data: [
      {
        id: 'admin-demo',
        email: 'admin@velocity.demo',
        name: 'Operations Admin',
        passwordHash: hashPassword(demoAdminPassword),
        role: 'ADMIN',
        publicProfile: false,
      },
      {
        id: 'business-demo',
        email: 'business@velocity.demo',
        name: 'Atlas Administrator',
        passwordHash: hashPassword(process.env.DEMO_BUSINESS_PASSWORD || 'VelocityBusiness2026!'),
        role: 'BUSINESS_ADMIN',
        organizationId: 'org-0',
      },
    ],
  });
  const hexes = turf
    .hexGrid([69.235, 41.285, 69.325, 41.355], 0.4, { units: 'kilometers' })
    .features.slice(0, 80);
  await db.territory.createMany({
    data: hexes.map((hex, i) => ({
      id: `territory-${i}`,
      name: `${['Anhor', 'Amir Temur', 'Navoi', 'Minor', 'City Garden', 'Silk Road', 'Independence', 'Mirabad'][i % 8]} ${String(i + 1).padStart(2, '0')}`,
      district: ['Yunusabad', 'Mirabad', 'Shaykhontohur'][i % 3],
      geometry: JSON.parse(JSON.stringify(hex.geometry)),
    })),
  });
  await db.territoryInfluence.createMany({
    data: hexes.flatMap((_, i) =>
      Array.from({ length: 3 }, (__, k) => ({
        userId: `user-${(i * 3 + k) % 250}`,
        territoryId: `territory-${i}`,
        seasonId: 'season-1',
        score: 40 + ((i * 17 + k * 29) % 250),
      })),
    ),
  });
  const missionNames = [
    'Your first chapter',
    'The 3 km club',
    'A little further',
    'Meet your city',
    'Morning momentum',
    'The weekend loop',
    'Green commute',
    'Discover Anhor',
  ];
  await db.mission.createMany({
    data: Array.from({ length: 40 }, (_, i) => ({
      id: `mission-${i}`,
      name:
        i < 8
          ? missionNames[i]
          : `${['City Explorer', 'Weekly Momentum', 'District Discovery', 'Weekend Wander'][i % 4]} ${Math.floor(i / 4)}`,
      description:
        i % 3 === 0
          ? 'Complete a ride at your own pace. Every journey starts with a single pedal.'
          : i % 3 === 1
            ? 'Build distance across your rides. Explore more and find your own rhythm.'
            : 'Ride through new virtual territories and see another side of Tashkent.',
      category: ['RIDES', 'DISTANCE', 'EXPLORATION'][i % 3],
      target:
        i % 3 === 0
          ? 1 + Math.floor(i / 12)
          : i % 3 === 1
            ? 3000 + Math.floor(i / 8) * 2000
            : 2 + Math.floor(i / 8),
      xp: 100 + (i % 5) * 50,
      points: 30 + (i % 4) * 10,
      startsAt: ago(1),
      endsAt: future(7 + (i % 22)),
      sponsored: i === 6,
    })),
  });
  await db.userMission.createMany({
    data: [
      { userId: 'user-0', missionId: 'mission-0', progress: 0 },
      { userId: 'user-0', missionId: 'mission-1', progress: 0 },
      { userId: 'user-0', missionId: 'mission-2', progress: 0 },
    ],
  });
  const rentals = Array.from({ length: 1120 }, (_, i) => {
    const userId = `user-${i % 250}`;
    const bikeId = `bike-${i % 120}`;
    const distanceM = 1400 + ((i * 139) % 8100);
    const durationSec = Math.ceil(distanceM / 3.6);
    const endedAt = new Date(ago(i % 29).getTime() - (i % 12) * 3600000);
    const startedAt = new Date(endedAt.getTime() - durationSec * 1000);
    return {
      id: `history-${i}`,
      userId,
      bikeId,
      state: 'COMPLETED',
      reservedAt: startedAt,
      expiresAt: startedAt,
      startedAt,
      endedAt,
      stationId: `station-${i % 18}`,
      distanceM,
      durationSec,
      price: priceFor(durationSec),
      xp: Math.floor(distanceM / 100) * 10,
      influence: Math.floor(distanceM / 100),
      demo: true,
    };
  });
  await db.rental.createMany({ data: rentals });
  await db.walletTransaction.createMany({
    data: rentals.map((r) => ({
      userId: r.userId,
      amount: -r.price,
      kind: 'DEMO_RENTAL',
      reference: r.id,
      createdAt: r.endedAt,
    })),
  });
  for (let i = 0; i < 250; i++) {
    const own = rentals.filter((r) => r.userId === `user-${i}`);
    await db.user.update({
      where: { id: `user-${i}` },
      data: { xp: own.reduce((s, r) => s + r.xp, 0) },
    });
  }
  await db.reward.createMany({
    data: [
      {
        id: 'reward-credit',
        name: 'More room to explore',
        description: '10,000 UZS credit for your demo wallet. Your next journey, on us.',
        kind: 'CREDIT',
        value: 10000,
        cost: 100,
        stock: 200,
      },
      {
        id: 'reward-frame',
        name: 'City Explorer profile frame',
        description: 'A collectible identity for the curious. Demo cosmetic voucher.',
        kind: 'COSMETIC',
        cost: 250,
        stock: 100,
      },
      {
        id: 'reward-partner',
        name: 'Coffee after the climb',
        description: 'Illustrative partner voucher. No commercial agreement or real redemption.',
        kind: 'VOUCHER',
        cost: 180,
        stock: 50,
      },
    ],
  });
  await db.landmark.createMany({
    data: [
      {
        id: 'landmark-0',
        name: 'Amir Temur Square',
        district: 'Yunusabad',
        lng: 69.2702,
        lat: 41.3118,
      },
      { id: 'landmark-1', name: 'Anhor Canal', district: 'Yunusabad', lng: 69.282, lat: 41.3242 },
      {
        id: 'landmark-2',
        name: 'Independence Square',
        district: 'Yunusabad',
        lng: 69.2688,
        lat: 41.321,
      },
      {
        id: 'landmark-3',
        name: 'Chorsu Bazaar',
        district: 'Shaykhontohur',
        lng: 69.235,
        lat: 41.326,
      },
      { id: 'landmark-4', name: 'Minor Mosque', district: 'Yunusabad', lng: 69.2785, lat: 41.339 },
      {
        id: 'landmark-5',
        name: 'Alisher Navoi Park',
        district: 'Chilanzar',
        lng: 69.247,
        lat: 41.298,
      },
    ],
  });
  await db.notification.create({
    data: {
      userId: 'user-0',
      title: 'Welcome to your next adventure.',
      body: 'The city is yours to discover. Join a mission, reserve a demo bike at Amir Temur Square, and try the city loop.',
    },
  });
  await db.corporateChallenge.create({
    data: {
      organizationId: 'org-0',
      name: 'A greener October',
      targetKm: 1500,
      endsAt: future(30),
    },
  });
  await seedSponsor();
  console.log(
    `Seeded 250 riders, 120 bikes, 18 stations, ${hexes.length} territories, 40 missions and 1,120 demo rides.`,
  );
}
seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
