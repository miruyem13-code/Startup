import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { z, ZodError } from 'zod/v4';
import { db, transaction } from './db';
import {
  hashPassword,
  verifyPassword,
  token,
  digest,
  ApiError,
  requireThat,
  safeUser,
} from './security';
import {
  loginSchema,
  registerSchema,
  profileSchema,
  bikeSchema,
  stationSchema,
  missionSchema,
} from '../../../packages/shared/schemas';
import { catalog, dashboard, analytics } from './domain/queries';
import { expireReservations, advanceRide, finishRide, DemoLock } from './domain/ride';
import { getRules, maintainCompetitions, requireTeamChangeAllowed } from './domain/competition';
import { operationsRouter } from './routes/operations';
import { engagementRouter } from './routes/engagement';
import { standings } from './domain/standings';
import { eligibleForMission, validatedMission } from './domain/missions';
import { sponsorsRouter } from './routes/sponsors';
import { corsOrigin, isAllowedOrigin } from './origins';
import type { User, Session } from '@prisma/client';
declare global {
  namespace Express {
    interface Request {
      viewer?: User;
      session?: Session;
    }
  }
}
export const app = express();
const friendshipPairKey = (first: string, second: string) => {
  const [a, b] = [first, second].sort();
  return `${a.length}:${a}${b.length}:${b}`;
};
const demo = process.env.DEMO_MODE !== 'false' && process.env.NODE_ENV !== 'production';
if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN?.startsWith('https://'))
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(
  '/api',
  rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
);
app.use(async (req, _res, next) => {
  try {
    const id = req.cookies.velocity_session;
    if (id) {
      const session = await db.session.findUnique({
        where: { id: digest(id) },
        include: { user: true },
      });
      if (session && session.expiresAt > new Date() && session.user.status === 'ACTIVE') {
        req.viewer = session.user;
        req.session = session;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});
app.use('/api', (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!isAllowedOrigin(req.headers.origin))
      return next(new ApiError(403, 'Invalid request origin.'));
    if (req.session && req.headers['x-csrf-token'] !== req.session.csrf)
      return next(new ApiError(403, 'Session protection failed. Refresh and try again.'));
  }
  next();
});
const auth = (req: Request, _res: Response, next: NextFunction) =>
  req.viewer ? next() : next(new ApiError(401, 'Please sign in to continue.'));
const admin = (req: Request, _res: Response, next: NextFunction) =>
  ['ADMIN', 'SUPER_ADMIN'].includes(req.viewer?.role || '')
    ? next()
    : next(new ApiError(403, 'Administrator access required.'));
const business = (req: Request, _res: Response, next: NextFunction) =>
  req.viewer?.role === 'BUSINESS_ADMIN' && req.viewer.organizationId
    ? next()
    : next(new ApiError(403, 'Organization administrator access required.'));
const guardDemo = (_req: Request, _res: Response, next: NextFunction) =>
  demo ? next() : next(new ApiError(403, 'Demo adapters are unavailable in production.'));
const authLimiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
export let broadcast = () => {};
export const setBroadcast = (fn: () => void) => {
  broadcast = fn;
};
let revokeUserSockets = (_userId: string) => {};
export const setSocketRevoker = (fn: (userId: string) => void) => {
  revokeUserSockets = fn;
};
async function createSession(user: User, res: Response) {
  const raw = token();
  const csrf = token();
  await db.session.create({
    data: {
      id: digest(raw),
      userId: user.id,
      csrf,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  res.cookie('velocity_session', raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 86400000,
    path: '/',
  });
  return { user: safeUser(user), csrf, demo };
}
const audit = (actorId: string, action: string, resource: string, summary: string) =>
  db.auditLog.create({ data: { actorId, action, resource, summary } });
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', demo });
});
app.get('/api/session', (req, res) =>
  res.json({
    user: req.viewer ? safeUser(req.viewer) : null,
    csrf: req.session?.csrf || null,
    demo,
  }),
);
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);
  const user = await transaction(async (tx) => {
    requireThat(
      !(await tx.user.findUnique({ where: { email: data.email.toLowerCase() } })),
      409,
      'An account already exists with this email.',
    );
    return tx.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: hashPassword(data.password),
        wallet: demo ? 100000 : 0,
      },
    });
  });
  res.status(201).json(await createSession(user, res));
});
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
  const valid = verifyPassword(data.password, user?.passwordHash || hashPassword('dummy-password'));
  requireThat(
    user && valid && user.status === 'ACTIVE',
    401,
    'Email or password is incorrect, or this account is suspended.',
  );
  res.json(await createSession(user!, res));
});
app.post('/api/auth/demo', guardDemo, async (_req, res) => {
  const user = await db.user.findUniqueOrThrow({ where: { email: 'rider@velocity.demo' } });
  res.json(await createSession(user, res));
});
app.post('/api/auth/logout', auth, async (req, res) => {
  await db.session.delete({ where: { id: req.session!.id } });
  revokeUserSockets(req.viewer!.id);
  res.clearCookie('velocity_session');
  res.json({ ok: true });
});
app.post('/api/auth/forgot', authLimiter, async (req, res) => {
  const { email } = z.object({ email: z.email() }).parse(req.body);
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  let devToken: string | undefined;
  if (user) {
    devToken = token();
    await db.passwordReset.create({
      data: { id: digest(devToken), userId: user.id, expiresAt: new Date(Date.now() + 15 * 60000) },
    });
  }
  res.json({
    message: 'If this account exists, a reset was requested. Email delivery is not connected.',
    ...(demo && devToken ? { devToken } : {}),
  });
});
app.post('/api/auth/reset', authLimiter, async (req, res) => {
  const data = z
    .object({ token: z.string().length(64), password: z.string().min(12).max(128) })
    .parse(req.body);
  await transaction(async (tx) => {
    const reset = await tx.passwordReset.findUnique({ where: { id: digest(data.token) } });
    requireThat(
      reset && !reset.used && reset.expiresAt > new Date(),
      422,
      'Reset link is invalid or expired.',
    );
    await tx.passwordReset.update({ where: { id: reset!.id }, data: { used: true } });
    await tx.user.update({
      where: { id: reset!.userId },
      data: { passwordHash: hashPassword(data.password) },
    });
    await tx.session.deleteMany({ where: { userId: reset!.userId } });
  });
  const resetUser = await db.passwordReset.findUnique({ where: { id: digest(data.token) } });
  if (resetUser) revokeUserSockets(resetUser.userId);
  res.json({ ok: true });
});
app.get('/api/catalog', async (_req, res) => {
  await transaction(async (tx) => {
    await expireReservations(tx);
    await maintainCompetitions(tx);
  });
  res.json(await catalog());
});
app.get('/api/dashboard', auth, async (req, res) => {
  await transaction(expireReservations);
  const days = Math.min(30, Math.max(7, Number(req.query.days) || 7));
  res.json(await dashboard(req.viewer!.id, days));
});
app.patch('/api/profile', auth, async (req, res) =>
  res.json(
    safeUser(
      await db.user.update({ where: { id: req.viewer!.id }, data: profileSchema.parse(req.body) }),
    ),
  ),
);
app.post('/api/rentals/reserve', auth, guardDemo, async (req, res) => {
  const { bikeId } = z.object({ bikeId: z.string() }).parse(req.body);
  await transaction(expireReservations);
  const result = await transaction(async (tx) => {
    const member = await tx.user.findUniqueOrThrow({
      where: { id: req.viewer!.id },
      select: { organizationId: true },
    });
    requireThat(
      !(await tx.rental.findFirst({
        where: { userId: req.viewer!.id, state: { in: ['RESERVED', 'ACTIVE'] } },
      })),
      409,
      'Finish or cancel your current rental first.',
    );
    const bike = await tx.bicycle.findUnique({ where: { id: bikeId }, include: { station: true } });
    requireThat(bike && bike.station.enabled, 404, 'Bike not found.');
    const changed = await tx.bicycle.updateMany({
      where: { id: bikeId, status: 'AVAILABLE' },
      data: { status: 'RESERVED' },
    });
    requireThat(changed.count === 1, 409, 'This bike is already reserved or unavailable.');
    const rules = await getRules(tx);
    const pass = await tx.subscription.findFirst({
      where: { userId: req.viewer!.id, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
    });
    return tx.rental.create({
      data: {
        userId: req.viewer!.id,
        organizationId: member.organizationId,
        bikeId,
        expiresAt: new Date(Date.now() + 10 * 60000),
        unlockFee: rules.unlockFee,
        perMinute: Math.ceil((rules.perMinute * (100 - (pass?.discountPercent || 0))) / 100),
      },
    });
  });
  broadcast();
  res.status(201).json(result);
});
app.post('/api/rentals/:id/cancel', auth, async (req, res) => {
  await transaction(async (tx) => {
    const ride = await tx.rental.findUnique({ where: { id: String(req.params.id) } });
    requireThat(
      ride && ride.userId === req.viewer!.id && ride.state === 'RESERVED',
      409,
      'Reservation cannot be cancelled.',
    );
    await tx.rental.update({ where: { id: ride!.id }, data: { state: 'CANCELLED' } });
    await tx.bicycle.update({ where: { id: ride!.bikeId }, data: { status: 'AVAILABLE' } });
  });
  broadcast();
  res.json({ ok: true });
});
app.post('/api/rentals/:id/unlock', auth, guardDemo, async (req, res) => {
  const { code } = z.object({ code: z.string() }).parse(req.body);
  await transaction(expireReservations);
  const result = await transaction(async (tx) => {
    const ride = await tx.rental.findUnique({
      where: { id: String(req.params.id) },
      include: { bike: { include: { station: true } } },
    });
    requireThat(ride && ride.userId === req.viewer!.id, 404, 'Reservation not found.');
    requireThat(
      ride!.state === 'RESERVED' && ride!.expiresAt > new Date(),
      409,
      'Reservation expired or already started.',
    );
    requireThat(code === ride!.bike.code, 422, 'Bike ID does not match your reservation.');
    requireThat(
      ride!.bike.station.name === 'Amir Temur Square',
      422,
      'This demo route begins at Amir Temur Square. Reserve a bike there.',
    );
    await new DemoLock().unlock(ride!.bikeId);
    await tx.bicycle.update({ where: { id: ride!.bikeId }, data: { status: 'IN_USE' } });
    return tx.rental.update({
      where: { id: ride!.id },
      data: { state: 'ACTIVE', startedAt: new Date() },
    });
  });
  broadcast();
  res.json({ ...result, simulated: true });
});
app.post('/api/rentals/:id/advance', auth, guardDemo, async (req, res) => {
  const { step } = z.object({ step: z.number().int().min(0).max(18) }).parse(req.body);
  const result = await transaction((tx) =>
    advanceRide(tx, String(req.params.id), req.viewer!.id, step),
  );
  broadcast();
  res.json(result);
});
app.post('/api/rentals/:id/pause', auth, async (req, res) => {
  const { paused } = z.object({ paused: z.boolean() }).parse(req.body);
  const changed = await db.rental.updateMany({
    where: { id: String(req.params.id), userId: req.viewer!.id, state: 'ACTIVE' },
    data: { simulationPaused: paused },
  });
  requireThat(changed.count, 409, 'Ride is not active.');
  res.json({ ok: true });
});
app.post('/api/rentals/:id/finish', auth, guardDemo, async (req, res) => {
  const { stationId } = z.object({ stationId: z.string() }).parse(req.body);
  const result = await transaction((tx) =>
    finishRide(tx, String(req.params.id), req.viewer!.id, stationId),
  );
  broadcast();
  res.json(result);
});
app.post('/api/missions/:id/join', auth, async (req, res) => {
  const mission = await db.mission.findUnique({ where: { id: String(req.params.id) } });
  requireThat(
    mission &&
      mission.status === 'PUBLISHED' &&
      mission.startsAt <= new Date() &&
      mission.endsAt > new Date(),
    404,
    'Mission is unavailable.',
  );
  requireThat(
    eligibleForMission(mission!.eligibility, req.viewer!),
    422,
    'This mission has XP or team eligibility requirements.',
  );
  if (mission!.sponsorId)
    requireThat(
      await db.sponsor.count({
        where: {
          id: mission!.sponsorId,
          status: 'APPROVED',
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
        },
      }),
      422,
      'This sponsorship is unavailable.',
    );
  res.json(
    await db.userMission.upsert({
      where: { userId_missionId: { userId: req.viewer!.id, missionId: mission!.id } },
      create: { userId: req.viewer!.id, missionId: mission!.id, joinedAt: new Date() },
      update: {},
    }),
  );
});
app.get('/api/leaderboard', async (req, res) => {
  const result = await standings(req.query, req.viewer?.id);
  res.json(req.query.format === 'paged' ? result : result.entries);
});
app.post('/api/teams/:id/join', auth, async (req, res) => {
  requireThat(
    await db.team.findUnique({ where: { id: String(req.params.id) } }),
    404,
    'Team not found.',
  );
  await transaction(async (tx) => {
    await requireTeamChangeAllowed(tx, req.viewer!.id);
    await tx.user.update({
      where: { id: req.viewer!.id },
      data: { teamId: String(req.params.id) },
    });
  });
  res.json({ ok: true });
});
app.post('/api/teams/leave', auth, async (req, res) => {
  await transaction(async (tx) => {
    await requireTeamChangeAllowed(tx, req.viewer!.id);
    await tx.user.update({ where: { id: req.viewer!.id }, data: { teamId: null } });
  });
  res.json({ ok: true });
});
app.get('/api/friends', auth, async (req, res) => {
  const relationships = await db.friendship.findMany({
    where: { OR: [{ requesterId: req.viewer!.id }, { addresseeId: req.viewer!.id }] },
    include: {
      requester: { select: { id: true, name: true, xp: true, team: { select: { name: true } } } },
      addressee: { select: { id: true, name: true, xp: true, team: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const excluded = new Set([
    req.viewer!.id,
    ...relationships.flatMap((friendship) => [friendship.requesterId, friendship.addresseeId]),
  ]);
  const suggestions = await db.user.findMany({
    where: { role: 'USER', publicProfile: true, id: { notIn: [...excluded] } },
    select: { id: true, name: true, xp: true, team: { select: { name: true } } },
    orderBy: [{ xp: 'desc' }, { name: 'asc' }],
    take: 12,
  });
  res.json({
    friends: relationships
      .filter((friendship) => friendship.status === 'ACCEPTED')
      .map((friendship) => ({
        id: friendship.id,
        user:
          friendship.requesterId === req.viewer!.id ? friendship.addressee : friendship.requester,
      })),
    incoming: relationships
      .filter(
        (friendship) =>
          friendship.status === 'PENDING' && friendship.addresseeId === req.viewer!.id,
      )
      .map((friendship) => ({ id: friendship.id, user: friendship.requester })),
    outgoing: relationships
      .filter(
        (friendship) =>
          friendship.status === 'PENDING' && friendship.requesterId === req.viewer!.id,
      )
      .map((friendship) => ({ id: friendship.id, user: friendship.addressee })),
    suggestions,
  });
});
app.post('/api/friends/requests', auth, async (req, res) => {
  const { userId } = z.object({ userId: z.string().min(1) }).parse(req.body);
  requireThat(userId !== req.viewer!.id, 422, 'You cannot add yourself.');
  const target = await db.user.findFirst({
    where: { id: userId, role: 'USER', publicProfile: true },
  });
  requireThat(target, 404, 'Explorer not found.');
  const result = await transaction(async (tx) => {
    const existing = await tx.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.viewer!.id, addresseeId: userId },
          { requesterId: userId, addresseeId: req.viewer!.id },
        ],
      },
    });
    requireThat(!existing, 409, 'A friend connection already exists.');
    let friendship;
    try {
      friendship = await tx.friendship.create({
        data: {
          requesterId: req.viewer!.id,
          addresseeId: userId,
          pairKey: friendshipPairKey(req.viewer!.id, userId),
        },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')
        throw new ApiError(409, 'A friend connection already exists.');
      throw error;
    }
    await tx.notification.create({
      data: {
        userId,
        title: 'A new city connection',
        body: `${req.viewer!.name} sent you a friend request.`,
      },
    });
    return friendship;
  });
  res.status(201).json(result);
});
app.patch('/api/friends/requests/:id', auth, async (req, res) => {
  const { status } = z.object({ status: z.enum(['ACCEPTED', 'DECLINED']) }).parse(req.body);
  const result = await transaction(async (tx) => {
    const request = await tx.friendship.findUnique({ where: { id: String(req.params.id) } });
    requireThat(
      request && request.addresseeId === req.viewer!.id && request.status === 'PENDING',
      404,
      'Friend request not found.',
    );
    if (status === 'DECLINED') {
      await tx.friendship.delete({ where: { id: request!.id } });
      return { ok: true };
    }
    const friendship = await tx.friendship.update({
      where: { id: request!.id },
      data: { status, respondedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: request!.requesterId,
        title: 'Friend request accepted',
        body: `${req.viewer!.name} is now part of your city circle.`,
      },
    });
    return friendship;
  });
  res.json(result);
});
app.delete('/api/friends/:id', auth, async (req, res) => {
  const friendship = await db.friendship.findUnique({ where: { id: String(req.params.id) } });
  requireThat(
    friendship && [friendship.requesterId, friendship.addresseeId].includes(req.viewer!.id),
    404,
    'Friend connection not found.',
  );
  await db.friendship.delete({ where: { id: friendship!.id } });
  res.json({ ok: true });
});
app.post('/api/rewards/:id/redeem', auth, guardDemo, async (req, res) => {
  const { key } = z.object({ key: z.string().uuid() }).parse(req.body);
  const result = await transaction(async (tx) => {
    const existing = await tx.rewardRedemption.findUnique({ where: { key } });
    if (existing) {
      requireThat(
        existing.userId === req.viewer!.id && existing.rewardId === String(req.params.id),
        409,
        'Request key already used.',
      );
      return existing;
    }
    const reward = await tx.reward.findUnique({ where: { id: String(req.params.id) } });
    requireThat(reward && reward.stock > 0, 409, 'Reward is out of stock.');
    const changed = await tx.user.updateMany({
      where: { id: req.viewer!.id, points: { gte: reward!.cost } },
      data: {
        points: { decrement: reward!.cost },
        wallet: { increment: reward!.kind === 'CREDIT' ? reward!.value : 0 },
      },
    });
    requireThat(changed.count, 422, 'Earn more loyalty points before redeeming this reward.');
    const stock = await tx.reward.updateMany({
      where: { id: reward!.id, stock: { gt: 0 } },
      data: { stock: { decrement: 1 } },
    });
    requireThat(stock.count, 409, 'Reward is out of stock.');
    const redemption = await tx.rewardRedemption.create({
      data: {
        userId: req.viewer!.id,
        rewardId: reward!.id,
        sponsorId: reward!.sponsorId,
        key,
        code: `DEMO-${token().slice(0, 8).toUpperCase()}`,
      },
    });
    if (reward!.kind === 'CREDIT')
      await tx.walletTransaction.create({
        data: {
          userId: req.viewer!.id,
          amount: reward!.value,
          kind: 'DEMO_REWARD',
          reference: redemption.id,
        },
      });
    return redemption;
  });
  broadcast();
  res.status(201).json(result);
});
app.post('/api/wallet/topup', auth, guardDemo, async (req, res) => {
  const { amount, key } = z
    .object({ amount: z.number().int().min(10000).max(200000), key: z.string().uuid() })
    .parse(req.body);
  await transaction(async (tx) => {
    const existing = await tx.walletTransaction.findUnique({ where: { reference: key } });
    if (existing) {
      requireThat(existing.userId === req.viewer!.id, 409, 'Request already used.');
      return;
    }
    await tx.walletTransaction.create({
      data: { userId: req.viewer!.id, amount, kind: 'DEMO_TOPUP', reference: key },
    });
    await tx.user.update({
      where: { id: req.viewer!.id },
      data: { wallet: { increment: amount } },
    });
  });
  res.json({ ok: true });
});
app.post('/api/notifications/read', auth, async (req, res) => {
  await db.notification.updateMany({ where: { userId: req.viewer!.id }, data: { read: true } });
  res.json({ ok: true });
});
app.post('/api/bikes/:id/report', auth, async (req, res) => {
  const { description } = z.object({ description: z.string().min(10).max(500) }).parse(req.body);
  const bike = await db.bicycle.findUnique({ where: { id: String(req.params.id) } });
  requireThat(bike, 404, 'Bike not found.');
  res.status(201).json(
    await db.maintenanceIssue.create({
      data: { bikeId: bike!.id, userId: req.viewer!.id, description },
    }),
  );
});
app.get('/api/admin/analytics', auth, admin, async (req, res) =>
  res.json(await analytics(Math.min(90, Math.max(1, Number(req.query.days) || 30)))),
);
app.get('/api/admin/users', auth, admin, async (req, res) =>
  res.json(
    await db.user.findMany({
      where: req.query.q
        ? {
            OR: [
              { name: { contains: String(req.query.q).slice(0, 80) } },
              { email: { contains: String(req.query.q).slice(0, 80) } },
              { role: { contains: String(req.query.q).slice(0, 80) } },
            ],
          }
        : {},
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { rentals: true } },
      },
      take: 100,
    }),
  ),
);
app.post('/api/admin/bikes', auth, admin, async (req, res) => {
  const data = bikeSchema.parse(req.body);
  const result = await transaction(async (tx) => {
    const station = await tx.station.findUnique({
      where: { id: data.stationId },
      include: { _count: { select: { bikes: true } } },
    });
    requireThat(
      station && station.enabled && station._count.bikes < station.capacity,
      422,
      'Station is full or unavailable.',
    );
    const bike = await tx.bicycle.create({ data });
    await tx.auditLog.create({
      data: {
        actorId: req.viewer!.id,
        action: 'BIKE_CREATED',
        resource: bike.id,
        summary: data.code,
      },
    });
    return bike;
  });
  broadcast();
  res.status(201).json(result);
});
app.patch('/api/admin/bikes/:id', auth, admin, async (req, res) => {
  const data = bikeSchema.parse(req.body);
  const result = await transaction(async (tx) => {
    const bike = await tx.bicycle.findUnique({ where: { id: String(req.params.id) } });
    requireThat(
      bike && !['RESERVED', 'IN_USE'].includes(bike.status),
      409,
      'An active bike cannot be edited.',
    );
    const station = await tx.station.findUnique({
      where: { id: data.stationId },
      include: { _count: { select: { bikes: true } } },
    });
    requireThat(
      station &&
        station.enabled &&
        (bike!.stationId === data.stationId || station._count.bikes < station.capacity),
      422,
      'Station is full or unavailable.',
    );
    const updated = await tx.bicycle.update({ where: { id: bike!.id }, data });
    await tx.auditLog.create({
      data: {
        actorId: req.viewer!.id,
        action: 'BIKE_UPDATED',
        resource: bike!.id,
        summary: `${data.code}: ${data.status}`,
      },
    });
    return updated;
  });
  broadcast();
  res.json(result);
});
app.delete('/api/admin/bikes/:id', auth, admin, async (req, res) => {
  const result = await transaction(async (tx) => {
    const bike = await tx.bicycle.findUnique({ where: { id: String(req.params.id) } });
    requireThat(
      bike && !['RESERVED', 'IN_USE'].includes(bike.status),
      409,
      'An active bike cannot be archived.',
    );
    const archived = await tx.bicycle.update({
      where: { id: bike!.id },
      data: { status: 'OFFLINE' },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.viewer!.id,
        action: 'BIKE_ARCHIVED',
        resource: bike!.id,
        summary: bike!.code,
      },
    });
    return archived;
  });
  broadcast();
  res.json(result);
});
app.post('/api/admin/stations', auth, admin, async (req, res) => {
  const result = await db.station.create({ data: stationSchema.parse(req.body) });
  await audit(req.viewer!.id, 'STATION_CREATED', result.id, result.name);
  res.status(201).json(result);
});
app.patch('/api/admin/stations/:id', auth, admin, async (req, res) => {
  const data = stationSchema.parse(req.body);
  const count = await db.bicycle.count({
    where: { stationId: String(req.params.id), status: { not: 'IN_USE' } },
  });
  requireThat(data.capacity >= count, 422, 'Capacity cannot be smaller than current occupancy.');
  const result = await db.station.update({ where: { id: String(req.params.id) }, data });
  await audit(req.viewer!.id, 'STATION_UPDATED', result.id, result.name);
  res.json(result);
});
app.delete('/api/admin/stations/:id', auth, admin, async (req, res) => {
  const stationId = String(req.params.id);
  const result = await transaction(async (tx) => {
    const station = await tx.station.findUnique({ where: { id: stationId } });
    requireThat(station && station.enabled, 404, 'Station not found.');
    const active = await tx.bicycle.count({
      where: { stationId, status: { in: ['RESERVED', 'IN_USE'] } },
    });
    requireThat(!active, 409, 'Move or finish active bicycles before archiving this station.');
    await tx.bicycle.updateMany({ where: { stationId }, data: { status: 'OFFLINE' } });
    const archived = await tx.station.update({
      where: { id: stationId },
      data: { enabled: false },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.viewer!.id,
        action: 'STATION_ARCHIVED',
        resource: stationId,
        summary: station!.name,
      },
    });
    return archived;
  });
  broadcast();
  res.json(result);
});
app.post('/api/admin/missions', auth, admin, async (req, res) => {
  const data = missionSchema.parse(req.body);
  const result = await transaction(async (tx) => {
    const mission = await tx.mission.create({ data: await validatedMission(tx, data) });
    await tx.auditLog.create({
      data: {
        actorId: req.viewer!.id,
        action: 'MISSION_CREATED',
        resource: mission.id,
        summary: `${mission.name}: ${mission.status}`,
      },
    });
    return mission;
  });
  broadcast();
  res.status(201).json(result);
});
app.get('/api/admin/missions', auth, admin, async (_req, res) =>
  res.json(
    await db.mission.findMany({
      include: {
        _count: { select: { participants: true } },
        participants: { select: { progress: true, completedAt: true } },
      },
    }),
  ),
);
app.patch('/api/admin/missions/:id', auth, admin, async (req, res) => {
  const data = missionSchema.parse(req.body);
  const result = await transaction(async (tx) => {
    const existing = await tx.mission.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { participants: true } } },
    });
    requireThat(existing && existing.status !== 'ARCHIVED', 404, 'Editable mission not found.');
    const validated = await validatedMission(tx, data, existing!.startsAt);
    if (existing!._count.participants)
      requireThat(
        data.category === existing!.category &&
          data.target === existing!.target &&
          data.xp === existing!.xp &&
          data.points === existing!.points &&
          validated.startsAt.getTime() === existing!.startsAt.getTime() &&
          JSON.stringify(data.eligibility) ===
            JSON.stringify(missionSchema.shape.eligibility.parse(existing!.eligibility)) &&
          data.sponsorId === existing!.sponsorId,
        409,
        'Joined missions preserve requirements, rewards, eligibility and start time. Create a new mission to change these terms.',
      );
    const updated = await tx.mission.update({ where: { id: existing!.id }, data: validated });
    await tx.auditLog.create({
      data: {
        actorId: req.viewer!.id,
        action: 'MISSION_UPDATED',
        resource: updated.id,
        summary: updated.name,
      },
    });
    return updated;
  });
  broadcast();
  res.json(result);
});
app.patch('/api/admin/missions/:id/status', auth, admin, async (req, res) => {
  const { status } = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED']) }).parse(req.body);
  const result = await db.mission.update({
    where: { id: String(req.params.id) },
    data: { status },
  });
  await audit(req.viewer!.id, 'MISSION_STATUS', result.id, status);
  broadcast();
  res.json(result);
});
app.delete('/api/admin/missions/:id', auth, admin, async (req, res) => {
  const result = await db.mission.update({
    where: { id: String(req.params.id) },
    data: { status: 'ARCHIVED' },
  });
  await audit(req.viewer!.id, 'MISSION_ARCHIVED', result.id, result.name);
  broadcast();
  res.json(result);
});
app.post('/api/admin/maintenance/:id/resolve', auth, admin, async (req, res) => {
  const result = await db.maintenanceIssue.update({
    where: { id: String(req.params.id) },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  await audit(req.viewer!.id, 'ISSUE_RESOLVED', result.id, result.description);
  res.json(result);
});
app.get('/api/admin/reports/rentals.csv', auth, admin, async (_req, res) => {
  const rentals = await db.rental.findMany({
    where: { state: 'COMPLETED' },
    include: { bike: true },
    orderBy: { endedAt: 'desc' },
    take: 10000,
  });
  res
    .type('text/csv')
    .attachment('velocity-demo-rentals.csv')
    .send(
      'rental,bike,distance_m,duration_sec,demo_charge_uzs,ended_at\n' +
        rentals
          .map((r) =>
            [r.id, r.bike.code, r.distanceM, r.durationSec, r.price, r.endedAt?.toISOString()].join(
              ',',
            ),
          )
          .join('\n'),
    );
});
app.get('/api/business/overview', auth, business, async (req, res) => {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: req.viewer!.organizationId! },
    include: { challenges: true },
  });
  const [members, rides, participants] = await Promise.all([
    db.user.count({ where: { organizationId: org.id } }),
    db.rental.aggregate({
      where: { state: 'COMPLETED', organizationId: org.id },
      _sum: { distanceM: true, durationSec: true },
      _count: true,
    }),
    db.user.count({
      where: { rentals: { some: { state: 'COMPLETED', organizationId: org.id } } },
    }),
  ]);
  res.json({
    organization: {
      ...org,
      challenges: await Promise.all(
        org.challenges.map(async (challenge) => {
          const activity = await db.rental.aggregate({
            where: {
              state: 'COMPLETED',
              organizationId: org.id,
              startedAt: { gte: challenge.startsAt },
              endedAt: { lte: challenge.endsAt },
            },
            _sum: { distanceM: true },
            _count: true,
          });
          return {
            ...challenge,
            distanceKm: (activity._sum.distanceM || 0) / 1000,
            rides: activity._count,
          };
        }),
      ),
    },
    members,
    participants,
    rides: rides._count,
    distanceKm: (rides._sum.distanceM || 0) / 1000,
    co2EstimateKg: +(((rides._sum.distanceM || 0) / 1000) * 0.16).toFixed(1),
  });
});
app.post('/api/business/challenges', auth, business, async (req, res) => {
  const data = z
    .object({
      name: z.string().min(3).max(100),
      targetKm: z.number().int().min(1).max(10000),
      endsAt: z.iso.datetime(),
    })
    .parse(req.body);
  requireThat(new Date(data.endsAt) > new Date(), 422, 'Choose a future deadline.');
  res.status(201).json(
    await db.corporateChallenge.create({
      data: {
        ...data,
        endsAt: new Date(data.endsAt),
        organizationId: req.viewer!.organizationId!,
      },
    }),
  );
});
app.get('/api/business/employees', auth, business, async (req, res) => {
  res.json(
    await db.user.findMany({
      where: { organizationId: req.viewer!.organizationId! },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { rentals: { where: { state: 'COMPLETED' } } } },
      },
      orderBy: { name: 'asc' },
    }),
  );
});
app.post('/api/business/employees', auth, business, async (req, res) => {
  const { email } = z.object({ email: z.email().max(254) }).parse(req.body);
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  requireThat(user && user.role === 'USER', 404, 'Eligible rider account not found.');
  requireThat(!user!.organizationId, 409, 'This rider already belongs to an organization.');
  const result = await transaction(async (tx) => {
    const existing = await tx.membershipInvitation.count({
      where: {
        userId: user!.id,
        organizationId: req.viewer!.organizationId!,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    requireThat(!existing, 409, 'An invitation is already pending.');
    const invitation = await tx.membershipInvitation.create({
      data: {
        senderId: req.viewer!.id,
        userId: user!.id,
        organizationId: req.viewer!.organizationId!,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    await tx.notification.create({
      data: {
        userId: user!.id,
        title: 'Organization invitation: open invitations to accept or decline',
        body: 'Accept in Notifications to connect your completed rides to shared challenges.',
      },
    });
    return invitation;
  });
  res.status(201).json(result);
});
app.delete('/api/business/employees/:id', auth, business, async (req, res) => {
  const userId = String(req.params.id);
  requireThat(userId !== req.viewer!.id, 422, 'You cannot remove your own administrator account.');
  const user = await db.user.findFirst({
    where: { id: userId, organizationId: req.viewer!.organizationId! },
  });
  requireThat(user, 404, 'Organization member not found.');
  await transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { organizationId: null } });
    await tx.notification.create({
      data: {
        userId,
        title: 'Organization membership updated',
        body: 'Your rider account is no longer connected to the organization workspace.',
      },
    });
  });
  res.json({ ok: true });
});
app.use(
  '/api',
  operationsRouter(
    auth,
    admin,
    () => broadcast(),
    (userId) => revokeUserSockets(userId),
  ),
);
app.use('/api', engagementRouter(auth, admin, guardDemo));
app.use('/api', sponsorsRouter(auth, admin, business, broadcast));
app.use('/api', (_req, _res, next) => next(new ApiError(404, 'This endpoint does not exist.')));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError)
    return res.status(422).json({ message: error.issues[0]?.message || 'Check your input.' });
  if (error instanceof ApiError) return res.status(error.status).json({ message: error.message });
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002')
    return res.status(409).json({ message: 'This record already exists.' });
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025')
    return res.status(404).json({ message: 'This record is unavailable.' });
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
