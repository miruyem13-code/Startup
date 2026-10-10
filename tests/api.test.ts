import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../apps/api/src/app';
import { db } from '../apps/api/src/db';
import { hashPassword } from '../apps/api/src/security';
import { priceFor, validatePoint } from '../apps/api/src/domain/ride';
import { DEMO_ROUTE } from '../packages/shared/schemas';
const origin = 'http://localhost:5173';
const rider = request.agent(app),
  rider2 = request.agent(app),
  admin = request.agent(app),
  business = request.agent(app);
let csrf = '',
  csrf2 = '',
  adminCsrf = '',
  businessCsrf = '',
  rentalId = '';
const post = (agent: typeof rider, path: string, body: object, token: string) =>
  agent
    .post('/api' + path)
    .set('Origin', origin)
    .set('X-CSRF-Token', token)
    .send(body);
beforeAll(async () => {
  const passwordHash = hashPassword('VelocityTest2026!');
  await db.organization.create({ data: { id: 'org', name: 'Test Organization' } });
  await db.user.createMany({
    data: [
      {
        id: 'rider',
        name: 'Test Rider',
        email: 'rider@velocity.demo',
        passwordHash,
        wallet: 100000,
        points: 500,
      },
      {
        id: 'rider2',
        name: 'Other Rider',
        email: 'other@example.com',
        passwordHash,
        wallet: 100000,
      },
      {
        id: 'admin',
        name: 'Administrator',
        email: 'admin@example.com',
        passwordHash,
        role: 'ADMIN',
      },
      {
        id: 'business',
        name: 'Organization Admin',
        email: 'business@example.com',
        passwordHash,
        role: 'BUSINESS_ADMIN',
        organizationId: 'org',
      },
    ],
  });
  await db.team.createMany({
    data: [
      {
        id: 'team-one',
        name: 'Test Community One',
        description: 'A test community for trusted competition.',
        color: '#276749',
      },
      {
        id: 'team-two',
        name: 'Test Community Two',
        description: 'A second team for competitive test coverage.',
        color: '#829462',
      },
    ],
  });
  await db.user.update({ where: { id: 'rider' }, data: { teamId: 'team-one' } });
  await db.battle.create({
    data: {
      id: 'battle',
      name: 'Trusted ride competition',
      description: 'Only completed validated rides count towards standings.',
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 86400000),
      rewardPoints: 25,
      participants: { create: [{ teamId: 'team-one' }, { teamId: 'team-two' }] },
    },
  });
  await db.station.create({
    data: {
      id: 'station',
      name: 'Amir Temur Square',
      district: 'Yunusabad',
      lat: DEMO_ROUTE[0][1],
      lng: DEMO_ROUTE[0][0],
      capacity: 20,
    },
  });
  await db.bicycle.createMany({
    data: [
      { id: 'bike', code: 'V-001', stationId: 'station' },
      { id: 'bike2', code: 'V-002', stationId: 'station' },
      { id: 'broken', code: 'V-003', stationId: 'station', status: 'MAINTENANCE' },
    ],
  });
  await db.season.create({
    data: {
      id: 'season',
      name: 'Test season',
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 86400000),
    },
  });
  await db.territory.create({
    data: {
      id: 'territory',
      name: 'City center',
      district: 'Yunusabad',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [69.26, 41.3],
            [69.3, 41.3],
            [69.3, 41.33],
            [69.26, 41.33],
            [69.26, 41.3],
          ],
        ],
      },
    },
  });
  await db.mission.createMany({
    data: [
      {
        id: 'first',
        name: 'Your first ride',
        description: 'Complete a trusted ride.',
        category: 'RIDES',
        target: 1,
        xp: 100,
        points: 40,
        endsAt: new Date(Date.now() + 86400000),
      },
      {
        id: 'distance',
        name: 'Ride three km',
        description: 'Accumulate three kilometers.',
        category: 'DISTANCE',
        target: 3000,
        xp: 150,
        points: 30,
        endsAt: new Date(Date.now() + 86400000),
      },
    ],
  });
  await db.mission.create({
    data: {
      id: 'exploration',
      name: 'Two distinct territories',
      description: 'Repeated territories must not advance unique exploration.',
      category: 'EXPLORATION',
      target: 2,
      xp: 100,
      endsAt: new Date(Date.now() + 86400000),
    },
  });
  await db.reward.create({
    data: {
      id: 'credit',
      name: 'Ride credit',
      description: 'Demo credit',
      cost: 100,
      stock: 5,
      kind: 'CREDIT',
      value: 10000,
    },
  });
  await db.landmark.create({
    data: {
      id: 'landmark',
      name: 'The Square',
      district: 'Yunusabad',
      lat: DEMO_ROUTE[0][1],
      lng: DEMO_ROUTE[0][0],
    },
  });
  await db.achievement.create({
    data: { id: 'first-ride', name: 'New beginning', description: 'First completed ride' },
  });
  for (const [agent, email, assign] of [
    [rider, 'rider@velocity.demo', (t: string) => (csrf = t)],
    [rider2, 'other@example.com', (t: string) => (csrf2 = t)],
    [admin, 'admin@example.com', (t: string) => (adminCsrf = t)],
    [business, 'business@example.com', (t: string) => (businessCsrf = t)],
  ] as const) {
    const result = await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email, password: 'VelocityTest2026!' });
    expect(result.status).toBe(200);
    assign(result.body.csrf);
  }
});
afterAll(() => db.$disconnect());
describe('identity and security', () => {
  it('rejects wrong passwords and strips password hashes', async () => {
    const result = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: 'admin@example.com', password: 'wrong-password' });
    expect(result.status).toBe(401);
    const session = await rider.get('/api/session');
    expect(session.body.user.passwordHash).toBeUndefined();
    expect(session.headers['set-cookie']).toBeUndefined();
  });
  it('registers a user and prevents role escalation', async () => {
    const result = await request(app).post('/api/auth/register').set('Origin', origin).send({
      name: 'New Explorer',
      email: 'new@example.com',
      password: 'VeryStrongPassword!',
      role: 'SUPER_ADMIN',
      xp: 999999,
    });
    expect(result.status).toBe(201);
    expect(result.body.user.role).toBe('USER');
    expect(result.body.user.xp).toBe(0);
    expect(result.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(result.headers['set-cookie'][0]).toContain('SameSite=Lax');
  });
  it('supports signup, login, protected sessions and logout from the 127.0.0.1 dev origin', async () => {
    const origin127 = 'http://127.0.0.1:5173';
    const signup = request.agent(app);
    const registered = await signup
      .post('/api/auth/register')
      .set('Origin', origin127)
      .send({
        name: 'Loopback Explorer',
        email: `loopback-${crypto.randomUUID()}@example.com`,
        password: 'VeryStrongPassword!',
      });
    expect(registered.status).toBe(201);
    expect(registered.headers['access-control-allow-origin']).toBe(origin127);
    expect(registered.headers['access-control-allow-credentials']).toBe('true');
    expect(registered.headers['set-cookie'][0]).toContain('HttpOnly');
    expect((await signup.get('/api/dashboard')).status).toBe(200);
    expect(
      (
        await signup
          .post('/api/auth/logout')
          .set('Origin', origin127)
          .set('X-CSRF-Token', registered.body.csrf)
          .send({})
      ).status,
    ).toBe(200);
    expect((await signup.get('/api/dashboard')).status).toBe(401);
    await db.user.update({ where: { id: registered.body.user.id }, data: { publicProfile: false } });

    const login = request.agent(app);
    const authenticated = await login
      .post('/api/auth/login')
      .set('Origin', origin127)
      .send({ email: 'admin@example.com', password: 'VelocityTest2026!' });
    expect(authenticated.status).toBe(200);
    expect((await login.get('/api/dashboard')).status).toBe(200);
    expect(
      (
        await login
          .post('/api/auth/logout')
          .set('Origin', origin127)
          .set('X-CSRF-Token', authenticated.body.csrf)
          .send({})
      ).status,
    ).toBe(200);
    expect((await login.get('/api/dashboard')).status).toBe(401);
  });
  it('allows only the configured local Vite fallback origins on port 5174', async () => {
    for (const devOrigin of ['http://localhost:5174', 'http://127.0.0.1:5174']) {
      const result = await request(app)
        .post('/api/auth/login')
        .set('Origin', devOrigin)
        .send({ email: 'admin@example.com', password: 'incorrect-test-password' });
      expect(result.status).toBe(401);
      expect(result.headers['access-control-allow-origin']).toBe(devOrigin);
      expect(result.headers['access-control-allow-credentials']).toBe('true');
    }
  });
  it('requires authentication, roles, CSRF and origin', async () => {
    expect((await request(app).get('/api/admin/analytics')).status).toBe(401);
    expect((await rider.get('/api/admin/analytics')).status).toBe(403);
    expect(
      (
        await rider
          .post('/api/wallet/topup')
          .set('Origin', origin)
          .send({ amount: 10000, key: crypto.randomUUID() })
      ).status,
    ).toBe(403);
    expect(
      (
        await post(rider, '/wallet/topup', { amount: 10000, key: crypto.randomUUID() }, csrf).set(
          'Origin',
          'https://evil.example',
        )
      ).status,
    ).toBe(403);
  });
});
describe('transactional rental lifecycle', () => {
  it('allows only one concurrent reservation for a bicycle', async () => {
    const result = await Promise.all([
      post(rider, '/rentals/reserve', { bikeId: 'bike' }, csrf),
      post(rider2, '/rentals/reserve', { bikeId: 'bike' }, csrf2),
    ]);
    expect(result.map((r) => r.status).sort()).toEqual([201, 409]);
    const winner = result.find((r) => r.status === 201)!;
    if (winner.body.userId === 'rider2') {
      await post(rider2, `/rentals/${winner.body.id}/cancel`, {}, csrf2);
      const reservation = await post(rider, '/rentals/reserve', { bikeId: 'bike' }, csrf);
      rentalId = reservation.body.id;
    } else rentalId = winner.body.id;
    expect(await db.rental.count({ where: { bikeId: 'bike', state: 'RESERVED' } })).toBe(1);
  });
  it('rejects second user rentals and maintenance bikes', async () => {
    expect((await post(rider, '/rentals/reserve', { bikeId: 'bike2' }, csrf)).status).toBe(409);
    expect((await post(rider2, '/rentals/reserve', { bikeId: 'broken' }, csrf2)).status).toBe(409);
  });
  it('expires reservations and releases the bike', async () => {
    const reserved = await post(rider2, '/rentals/reserve', { bikeId: 'bike2' }, csrf2);
    await db.rental.update({
      where: { id: reserved.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const result = await post(
      rider2,
      `/rentals/${reserved.body.id}/unlock`,
      { code: 'V-002' },
      csrf2,
    );
    expect(result.status).toBe(409);
    expect((await db.bicycle.findUniqueOrThrow({ where: { id: 'bike2' } })).status).toBe(
      'AVAILABLE',
    );
  });
  it('checks ownership and QR identity before simulated unlock', async () => {
    expect(
      (await post(rider2, `/rentals/${rentalId}/unlock`, { code: 'V-001' }, csrf2)).status,
    ).toBe(404);
    expect((await post(rider, `/rentals/${rentalId}/unlock`, { code: 'V-999' }, csrf)).status).toBe(
      422,
    );
    const result = await post(rider, `/rentals/${rentalId}/unlock`, { code: 'V-001' }, csrf);
    expect(result.status).toBe(200);
    expect(result.body.simulated).toBe(true);
  });
  it('joins missions and protects deterministic progress from duplicate steps', async () => {
    expect(
      (await post(rider, `/rentals/${rentalId}/finish`, { stationId: 'station' }, csrf)).status,
    ).toBe(422);
    await post(rider, '/missions/first/join', {}, csrf);
    await post(rider, '/missions/distance/join', {}, csrf);
    await post(rider, '/missions/exploration/join', {}, csrf);
    const first = await post(rider, `/rentals/${rentalId}/advance`, { step: 0 }, csrf);
    expect(first.status).toBe(200);
    expect((await post(rider, `/rentals/${rentalId}/advance`, { step: 0 }, csrf)).status).toBe(409);
    await post(rider, `/rentals/${rentalId}/pause`, { paused: true }, csrf);
    expect((await post(rider, `/rentals/${rentalId}/advance`, { step: 1 }, csrf)).status).toBe(409);
    await post(rider, `/rentals/${rentalId}/pause`, { paused: false }, csrf);
  });
  it('requires valid parking, finishes, and awards mission/XP/influence exactly once', async () => {
    for (let step = 1; step < 3; step++)
      await post(rider, `/rentals/${rentalId}/advance`, { step }, csrf);
    expect(
      (await post(rider, `/rentals/${rentalId}/finish`, { stationId: 'station' }, csrf)).status,
    ).toBe(422);
    for (let step = 3; step < 18; step++) {
      const result = await post(rider, `/rentals/${rentalId}/advance`, { step }, csrf);
      expect(result.status).toBe(200);
    }
    const result = await post(rider, `/rentals/${rentalId}/finish`, { stationId: 'station' }, csrf);
    expect(result.status).toBe(200);
    expect(result.body.state).toBe('COMPLETED');
    expect(result.body.distanceM).toBeGreaterThan(3000);
    const user = await db.user.findUniqueOrThrow({ where: { id: 'rider' } });
    const again = await post(rider, `/rentals/${rentalId}/finish`, { stationId: 'station' }, csrf);
    expect(again.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).xp).toBe(user.xp);
    expect(await db.walletTransaction.count({ where: { reference: rentalId } })).toBe(1);
    expect(await db.territoryContribution.count({ where: { rentalId } })).toBe(1);
    expect(await db.battleScore.count({ where: { rentalId } })).toBe(1);
    expect(
      (
        await db.userMission.findUniqueOrThrow({
          where: { userId_missionId: { userId: 'rider', missionId: 'exploration' } },
        })
      ).progress,
    ).toBe(1);
    expect(
      await db.userMission.count({ where: { userId: 'rider', completedAt: { not: null } } }),
    ).toBe(2);
    expect(
      await db.territoryInfluence.count({ where: { userId: 'rider', score: { gt: 0 } } }),
    ).toBe(1);
    expect(await db.passportStamp.count({ where: { userId: 'rider' } })).toBe(1);
    expect(
      await db.userAchievement.count({ where: { userId: 'rider', achievementId: 'first-ride' } }),
    ).toBe(1);
    expect(
      await db.userAchievement.count({
        where: { userId: 'rider', achievementId: 'early-adopter' },
      }),
    ).toBe(1);
    const board = await request(app).get('/api/leaderboard');
    expect(board.body[0].id).toBe('rider');
    expect((await db.bicycle.findUniqueOrThrow({ where: { id: 'bike' } })).status).toBe(
      'AVAILABLE',
    );
  });
});
describe('rewards and operations', () => {
  it('redeems rewards idempotently and validates balances', async () => {
    const key = crypto.randomUUID();
    const before = await db.user.findUniqueOrThrow({ where: { id: 'rider' } });
    const results = await Promise.all([
      post(rider, '/rewards/credit/redeem', { key }, csrf),
      post(rider, '/rewards/credit/redeem', { key }, csrf),
    ]);
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(results[0].body.id).toBe(results[1].body.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).points).toBe(
      before.points - 100,
    );
    expect((await db.reward.findUniqueOrThrow({ where: { id: 'credit' } })).stock).toBe(4);
    expect(
      (await post(rider2, '/rewards/credit/redeem', { key: crypto.randomUUID() }, csrf2)).status,
    ).toBe(422);
  });
  it('creates, publishes and pauses missions with audit logs', async () => {
    const created = await post(
      admin,
      '/admin/missions',
      {
        name: 'New pilot mission',
        description: 'Ride five kilometers at your own pace.',
        category: 'DISTANCE',
        target: 5000,
        xp: 150,
        points: 20,
        status: 'DRAFT',
        endsAt: new Date(Date.now() + 86400000).toISOString(),
      },
      adminCsrf,
    );
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(
      (await request(app).get('/api/catalog')).body.missions.some(
        (m: { id: string }) => m.id === id,
      ),
    ).toBe(false);
    expect(
      (
        await admin
          .patch(`/api/admin/missions/${id}/status`)
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({ status: 'PUBLISHED' })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/catalog')).body.missions.some(
        (m: { id: string }) => m.id === id,
      ),
    ).toBe(true);
    expect(
      (
        await admin
          .delete(`/api/admin/missions/${id}`)
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({})
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/catalog')).body.missions.some(
        (m: { id: string }) => m.id === id,
      ),
    ).toBe(false);
    expect(await db.auditLog.count()).toBeGreaterThanOrEqual(2);
  });
  it('supports admin inventory creation, editing, and aggregates', async () => {
    const added = await post(
      admin,
      '/admin/bikes',
      { code: 'V-121', type: 'CITY', status: 'AVAILABLE', stationId: 'station', battery: 100 },
      adminCsrf,
    );
    expect(added.status).toBe(201);
    expect(
      (
        await admin
          .patch(`/api/admin/bikes/${added.body.id}`)
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({
            code: 'V-121',
            type: 'CITY',
            status: 'OFFLINE',
            stationId: 'station',
            battery: 90,
          })
      ).status,
    ).toBe(200);
    expect(
      (
        await admin
          .delete(`/api/admin/bikes/${added.body.id}`)
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({})
      ).body.status,
    ).toBe('OFFLINE');
    const station = await post(
      admin,
      '/admin/stations',
      { name: 'Archive test station', district: 'Yunusabad', lat: 41.31, lng: 69.27, capacity: 4 },
      adminCsrf,
    );
    expect(
      (
        await admin
          .delete(`/api/admin/stations/${station.body.id}`)
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({})
      ).body.enabled,
    ).toBe(false);
    const report = await admin.get('/api/admin/analytics');
    expect(report.body.stats.rides).toBe(1);
    expect(report.body.stats.revenue).toBe(priceFor(1620));
    expect((await rider.get('/api/admin/reports/rentals.csv')).status).toBe(403);
    expect((await admin.get('/api/admin/reports/rentals.csv')).text).toContain('demo_charge_uzs');
  });
  it('isolates organization analytics and persists corporate challenges', async () => {
    expect((await rider.get('/api/business/overview')).status).toBe(403);
    const result = await business.get('/api/business/overview');
    expect(result.status).toBe(200);
    expect(result.body.members).toBe(1);
    expect(result.body.distanceKm).toBe(0);
    expect(
      (
        await post(
          business,
          '/business/challenges',
          {
            name: 'Together in motion',
            targetKm: 100,
            endsAt: new Date(Date.now() + 86400000).toISOString(),
          },
          businessCsrf,
        )
      ).status,
    ).toBe(201);
    const added = await post(
      business,
      '/business/employees',
      { email: 'other@example.com' },
      businessCsrf,
    );
    expect(added.status).toBe(201);
    const employees = await business.get('/api/business/employees');
    expect(employees.body.some((employee: { id: string }) => employee.id === 'rider2')).toBe(false);
    expect(
      (await post(rider2, `/invitations/${added.body.id}/respond`, { accept: true }, csrf2)).status,
    ).toBe(200);
    expect(
      (await business.get('/api/business/employees')).body.some(
        (employee: { id: string }) => employee.id === 'rider2',
      ),
    ).toBe(true);
    expect(
      (
        await business
          .delete('/api/business/employees/rider2')
          .set('Origin', origin)
          .set('X-CSRF-Token', businessCsrf)
          .send({})
      ).status,
    ).toBe(200);
    expect((await business.get('/api/business/employees')).body).toHaveLength(1);
  });
  it('attributes completed rentals to the organization at reservation time', async () => {
    await db.user.update({ where: { id: 'rider2' }, data: { organizationId: 'org' } });
    const reservation = await post(rider2, '/rentals/reserve', { bikeId: 'bike2' }, csrf2);
    expect(reservation.status).toBe(201);
    expect(reservation.body.organizationId).toBe('org');
    await db.user.update({ where: { id: 'rider2' }, data: { organizationId: null } });
    await db.rental.update({
      where: { id: reservation.body.id },
      data: {
        state: 'COMPLETED',
        startedAt: new Date(Date.now() - 3600000),
        endedAt: new Date(),
        distanceM: 5000,
      },
    });
    expect((await business.get('/api/business/overview')).body.distanceKm).toBe(5);
    await db.rental.update({
      where: { id: reservation.body.id },
      data: { state: 'CANCELLED', organizationId: null },
    });
    await db.bicycle.update({ where: { id: 'bike2' }, data: { status: 'AVAILABLE' } });
  });
  it('persists friend requests, acceptance, notifications, and removal', async () => {
    const created = await post(rider, '/friends/requests', { userId: 'rider2' }, csrf);
    expect(created.status).toBe(201);
    expect((await rider2.get('/api/friends')).body.incoming).toHaveLength(1);
    expect(
      (
        await rider2
          .patch(`/api/friends/requests/${created.body.id}`)
          .set('Origin', origin)
          .set('X-CSRF-Token', csrf2)
          .send({ status: 'ACCEPTED' })
      ).status,
    ).toBe(200);
    expect((await rider.get('/api/friends')).body.friends[0].user.id).toBe('rider2');
    expect((await post(rider2, '/friends/requests', { userId: 'rider' }, csrf2)).status).toBe(409);
    expect((await post(rider, '/friends/requests', { userId: 'rider2' }, csrf)).status).toBe(409);
    expect(
      (
        await rider
          .delete(`/api/friends/${created.body.id}`)
          .set('Origin', origin)
          .set('X-CSRF-Token', csrf)
          .send({})
      ).status,
    ).toBe(200);
    expect((await rider.get('/api/friends')).body.friends).toHaveLength(0);
  });
});
describe('scoring and money rules', () => {
  it('uses whole started minutes and integer UZS', () => {
    expect(priceFor(0)).toBe(2000);
    expect(priceFor(1)).toBe(2400);
    expect(priceFor(60)).toBe(2400);
    expect(priceFor(61)).toBe(2800);
  });
  it('rejects implausible GPS and duplicate coordinates', () => {
    expect(() => validatePoint(DEMO_ROUTE[0], DEMO_ROUTE[0], 90)).toThrow();
    expect(() => validatePoint(DEMO_ROUTE[0], [70, 42], 1)).toThrow();
    expect(() => validatePoint(DEMO_ROUTE[0], DEMO_ROUTE[1], 0)).toThrow();
  });
});
describe('competition, identity and engagement extensions', () => {
  it('filters standings by trusted activity and protects private social profiles', async () => {
    expect((await request(app).get('/api/leaderboard?scope=FRIENDS')).status).toBe(401);
    const distance = await rider.get('/api/leaderboard?format=paged&metric=DISTANCE&period=WEEK');
    expect(distance.status).toBe(200);
    expect(distance.body.entries[0].id).toBe('rider');
    expect(distance.body.entries[0].score).toBeGreaterThan(3000);
    expect(distance.body.total).toBe(3);
    expect((await rider.get('/api/leaderboard?metric=UNTRUSTED')).status).toBe(422);
    const profile = await rider.get('/api/profiles/rider2');
    expect(profile.status).toBe(200);
    expect(profile.body.email).toBeUndefined();
    expect(profile.body.wallet).toBeUndefined();
    await db.user.update({ where: { id: 'rider2' }, data: { publicProfile: false } });
    expect((await rider.get('/api/profiles/rider2')).status).toBe(404);
    expect((await rider.get('/api/leaderboard?format=paged')).body.total).toBe(2);
    await db.user.update({ where: { id: 'rider2' }, data: { publicProfile: true } });
  });
  it('scores only trusted rides, locks competing membership and finalizes rewards once', async () => {
    expect((await post(rider, '/teams/leave', {}, csrf)).status).toBe(409);
    const board = await rider.get('/api/battles');
    expect(board.body[0].participants[0].score).toBeGreaterThan(3000);
    const before = (await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).points;
    expect((await post(admin, '/admin/challenges/battle/close', {}, adminCsrf)).status).toBe(200);
    expect((await post(admin, '/admin/challenges/battle/close', {}, adminCsrf)).status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).points).toBe(before + 25);
    expect(
      (
        await db.battleParticipant.findUniqueOrThrow({
          where: { battleId_teamId: { battleId: 'battle', teamId: 'team-one' } },
        })
      ).rank,
    ).toBe(1);
    expect(
      await db.userAchievement.count({
        where: { userId: 'rider', achievementId: 'team-champion' },
      }),
    ).toBe(1);
  });
  it('prevents repeated-territory farming and counts distinct exploration across rides', async () => {
    const reservation = await post(rider, '/rentals/reserve', { bikeId: 'bike' }, csrf);
    expect(reservation.status).toBe(201);
    const id = reservation.body.id;
    expect((await post(rider, `/rentals/${id}/unlock`, { code: 'V-001' }, csrf)).status).toBe(200);
    for (let step = 0; step < 18; step++)
      expect((await post(rider, `/rentals/${id}/advance`, { step }, csrf)).status).toBe(200);
    const finished = await post(rider, `/rentals/${id}/finish`, { stationId: 'station' }, csrf);
    expect(finished.status).toBe(200);
    expect(finished.body.influence).toBe(0);
    expect(
      await db.userAchievement.count({ where: { userId: 'rider', achievementId: 'distance-10' } }),
    ).toBe(1);
    expect(await db.territoryContribution.count({ where: { rentalId: id } })).toBe(0);
    expect(
      (
        await db.userMission.findUniqueOrThrow({
          where: { userId_missionId: { userId: 'rider', missionId: 'exploration' } },
        })
      ).progress,
    ).toBe(1);
  });
  it('freezes season results and starts a clean next season without resetting XP', async () => {
    const xp = (await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).xp;
    expect((await post(admin, '/admin/seasons/season/close', {}, adminCsrf)).status).toBe(200);
    expect((await post(admin, '/admin/seasons/season/close', {}, adminCsrf)).status).toBe(200);
    expect(await db.seasonStanding.count({ where: { seasonId: 'season' } })).toBe(1);
    expect(
      await db.userAchievement.count({
        where: { userId: 'rider', achievementId: 'season-champion' },
      }),
    ).toBe(1);
    expect(
      (
        await post(
          admin,
          '/admin/seasons',
          {
            name: 'The next chapter',
            startsAt: new Date(Date.now() - 1000).toISOString(),
            endsAt: new Date(Date.now() + 86400000).toISOString(),
          },
          adminCsrf,
        )
      ).status,
    ).toBe(201);
    expect((await rider.get('/api/dashboard')).body.stats.influence).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).xp).toBe(xp);
  });
  it('persists contact messages, restricts their inbox and verifies email once', async () => {
    const contact = await request(app).post('/api/contact').set('Origin', origin).send({
      name: 'Pilot visitor',
      email: 'visitor@example.com',
      message: 'I would like to discuss a local mobility pilot.',
    });
    expect(contact.status).toBe(201);
    expect((await rider.get('/api/admin/feedback')).status).toBe(403);
    expect((await admin.get('/api/admin/feedback')).body[0].id).toBe(contact.body.id);
    const verification = await post(rider, '/auth/verification/request', {}, csrf);
    expect(verification.status).toBe(200);
    expect(
      (await post(rider, '/auth/verification/confirm', { token: verification.body.devToken }, csrf))
        .status,
    ).toBe(200);
    expect(
      (await post(rider, '/auth/verification/confirm', { token: verification.body.devToken }, csrf))
        .status,
    ).toBe(422);
  });
  it('charges a pass once, captures reservation discounts and cancels without refund', async () => {
    await db.pricingPlan.create({
      data: {
        id: 'test-pass',
        name: 'Test day pass',
        price: 10000,
        durationDays: 1,
        discountPercent: 25,
      },
    });
    const key = '44444444-4444-4444-8444-444444444444';
    const before = (await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).wallet;
    const pass = await post(rider, '/subscriptions', { planId: 'test-pass', key }, csrf);
    expect(pass.status).toBe(201);
    expect((await post(rider, '/subscriptions', { planId: 'test-pass', key }, csrf)).body.id).toBe(
      pass.body.id,
    );
    expect((await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).wallet).toBe(
      before - 10000,
    );
    const reservation = await post(rider, '/rentals/reserve', { bikeId: 'bike' }, csrf);
    expect(reservation.body.perMinute).toBe(300);
    await post(rider, `/rentals/${reservation.body.id}/cancel`, {}, csrf);
    expect((await post(rider, `/subscriptions/${pass.body.id}/cancel`, {}, csrf)).status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: 'rider' } })).wallet).toBe(
      before - 10000,
    );
  });
  it('enforces super-administrator role grants and blocks suspended sessions', async () => {
    expect(
      (
        await admin
          .patch('/api/admin/users/rider2')
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({ role: 'ADMIN' })
      ).status,
    ).toBe(403);
    expect(
      (
        await admin
          .patch('/api/admin/users/rider2')
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({ status: 'SUSPENDED' })
      ).status,
    ).toBe(200);
    expect((await rider2.get('/api/dashboard')).status).toBe(401);
    expect(
      (
        await admin
          .patch('/api/admin/users/rider2')
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({ status: 'ACTIVE' })
      ).status,
    ).toBe(200);
  });
  it('protects joined mission terms and evaluates duration, influence and full-loop requirements', async () => {
    const ids: string[] = [];
    for (const [category, target] of [
      ['DURATION', 90],
      ['INFLUENCE', 1],
      ['ROUTE', 1],
      ['ACTIVE_DAYS', 2],
      ['DISTRICTS', 2],
    ] as const) {
      const mission = await post(
        admin,
        '/admin/missions',
        {
          name: `${category} pilot challenge`,
          description: 'Progress requires a trusted completed backend ride.',
          category,
          target,
          xp: 100,
          points: 10,
          status: 'PUBLISHED',
          endsAt: new Date(Date.now() + 86400000).toISOString(),
        },
        adminCsrf,
      );
      expect(mission.status).toBe(201);
      ids.push(mission.body.id);
      expect((await post(rider, `/missions/${mission.body.id}/join`, {}, csrf)).status).toBe(200);
      expect(
        (
          await admin
            .patch(`/api/admin/missions/${mission.body.id}`)
            .set('Origin', origin)
            .set('X-CSRF-Token', adminCsrf)
            .send({ ...mission.body, target: target + 1 })
        ).status,
      ).toBe(409);
    }
    const reservation = await post(rider, '/rentals/reserve', { bikeId: 'bike' }, csrf);
    expect(reservation.status).toBe(201);
    const id = reservation.body.id;
    expect((await post(rider, `/rentals/${id}/unlock`, { code: 'V-001' }, csrf)).status).toBe(200);
    expect((await post(rider, `/rentals/${id}/advance`, { step: 0 }, csrf)).status).toBe(200);
    expect(
      (await post(rider, `/rentals/${id}/finish`, { stationId: 'station' }, csrf)).status,
    ).toBe(200);
    const missions = await db.userMission.findMany({
      where: { userId: 'rider', missionId: { in: ids } },
      orderBy: { missionId: 'asc' },
    });
    expect(missions.find((entry) => entry.missionId === ids[0])?.completedAt).toBeTruthy();
    expect(missions.find((entry) => entry.missionId === ids[1])?.progress).toBe(0);
    expect(missions.find((entry) => entry.missionId === ids[2])?.progress).toBe(0);
    expect(missions.find((entry) => entry.missionId === ids[3])?.progress).toBe(1);
    expect(missions.find((entry) => entry.missionId === ids[4])?.progress).toBe(1);
  });
  it('guards maintenance transitions and exports safe database reports', async () => {
    const report = await post(
      rider,
      '/bikes/bike/report',
      { description: 'Inspect the rear reflector before the next rental.' },
      csrf,
    );
    expect(report.status).toBe(201);
    const reservation = await post(rider, '/rentals/reserve', { bikeId: 'bike' }, csrf);
    expect(reservation.status).toBe(201);
    const patch = () =>
      admin
        .patch(`/api/admin/maintenance/${report.body.id}`)
        .set('Origin', origin)
        .set('X-CSRF-Token', adminCsrf)
        .send({
          severity: 'HIGH',
          technician: 'Pilot technician',
          notes: 'Reflector inspection scheduled.',
          status: 'IN_PROGRESS',
          takeOffline: true,
        });
    expect((await patch()).status).toBe(409);
    expect((await post(rider, `/rentals/${reservation.body.id}/cancel`, {}, csrf)).status).toBe(
      200,
    );
    expect((await patch()).status).toBe(200);
    expect((await db.bicycle.findUniqueOrThrow({ where: { id: 'bike' } })).status).toBe(
      'MAINTENANCE',
    );
    expect((await rider.get('/api/admin/intelligence')).status).toBe(403);
    const intelligence = await admin.get('/api/admin/intelligence');
    expect(intelligence.body.sampleSize).toBe(
      await db.rental.count({ where: { state: 'COMPLETED' } }),
    );
    const station = await db.station.findUniqueOrThrow({ where: { id: 'station' } });
    await db.station.update({ where: { id: station.id }, data: { name: '=SUM(1,1)' } });
    const inventory = await admin.get('/api/admin/reports/inventory.csv');
    expect(inventory.status).toBe(200);
    expect(inventory.text).toContain('"\'=SUM(1,1)"');
    expect((await rider.get('/api/admin/reports/inventory.csv')).status).toBe(403);
    await db.station.update({ where: { id: station.id }, data: { name: station.name } });
  });
  it('requires sponsor approval, enforces organization scope and hides paused sponsorships', async () => {
    const sponsor = await post(
      business,
      '/business/sponsors',
      {
        name: 'Test city sponsor',
        description: 'An illustrative sponsorship awaiting operations approval.',
        color: '#276749',
        startsAt: new Date(Date.now() - 1000).toISOString(),
        endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
      businessCsrf,
    );
    expect(sponsor.status).toBe(201);
    const body = {
      name: 'Sponsored test adventure',
      description: 'Complete a trusted ride through the demonstration city.',
      category: 'RIDES',
      target: 1,
      xp: 100,
      points: 10,
      status: 'PUBLISHED',
      sponsorId: sponsor.body.id,
      endsAt: new Date(Date.now() + 86400000).toISOString(),
    };
    expect((await post(business, '/business/sponsored-missions', body, businessCsrf)).status).toBe(
      422,
    );
    expect((await rider.get('/api/admin/sponsors')).status).toBe(403);
    expect(
      (
        await admin
          .patch(`/api/admin/sponsors/${sponsor.body.id}`)
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({ status: 'APPROVED' })
      ).status,
    ).toBe(200);
    const sponsoredReward = await post(
      business,
      `/business/sponsors/${sponsor.body.id}/rewards`,
      {
        name: 'City ride voucher',
        description: 'A demonstration sponsor voucher for active city riders.',
        cost: 10,
        stock: 2,
        kind: 'VOUCHER',
        value: 0,
      },
      businessCsrf,
    );
    expect(sponsoredReward.status).toBe(201);
    const redemption = await post(
      rider,
      `/rewards/${sponsoredReward.body.id}/redeem`,
      { key: crypto.randomUUID() },
      csrf,
    );
    expect(redemption.status).toBe(201);
    expect(
      (await db.rewardRedemption.findUniqueOrThrow({ where: { id: redemption.body.id } })).sponsorId,
    ).toBe(sponsor.body.id);
    const sponsorInventory = (await business.get('/api/business/sponsors')).body.find(
      (entry: { id: string }) => entry.id === sponsor.body.id,
    );
    expect(sponsorInventory.rewards[0]).toMatchObject({ stock: 1, redemptions: 1 });
    const mission = await post(business, '/business/sponsored-missions', body, businessCsrf);
    expect(mission.status).toBe(201);
    expect(mission.body.status).toBe('DRAFT');
    expect(
      (
        await admin
          .patch(`/api/admin/missions/${mission.body.id}/status`)
          .set('Origin', origin)
          .set('X-CSRF-Token', adminCsrf)
          .send({ status: 'PUBLISHED' })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/catalog')).body.missions.some(
        (entry: { id: string }) => entry.id === mission.body.id,
      ),
    ).toBe(true);
    await admin
      .patch(`/api/admin/sponsors/${sponsor.body.id}`)
      .set('Origin', origin)
      .set('X-CSRF-Token', adminCsrf)
      .send({ status: 'PAUSED' });
    expect(
      (await request(app).get('/api/catalog')).body.missions.some(
        (entry: { id: string }) => entry.id === mission.body.id,
      ),
    ).toBe(false);
    expect((await post(rider, `/missions/${mission.body.id}/join`, {}, csrf)).status).toBe(422);
    await db.organization.create({ data: { id: 'org2', name: 'Other organization' } });
    const foreign = await db.sponsor.create({
      data: {
        name: 'Other organization sponsor',
        description: 'Unavailable to this business administrator.',
        organizationId: 'org2',
        status: 'APPROVED',
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    expect(
      (
        await post(
          business,
          `/business/sponsors/${foreign.id}/rewards`,
          {
            name: 'Foreign sponsor voucher',
            description: 'This reward belongs to another organizations sponsor.',
            cost: 10,
            stock: 1,
            kind: 'VOUCHER',
            value: 0,
          },
          businessCsrf,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await post(
          business,
          '/business/sponsored-missions',
          { ...body, sponsorId: foreign.id },
          businessCsrf,
        )
      ).status,
    ).toBe(404);
  });
});
