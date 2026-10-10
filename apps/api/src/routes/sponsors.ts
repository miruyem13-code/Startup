import { Router, type RequestHandler } from 'express';
import { z } from 'zod/v4';
import { db, transaction } from '../db.js';
import { requireThat } from '../security.js';
import { missionSchema } from '../../../../packages/shared/schemas.js';
import { validatedMission } from '../domain/missions.js';

const sponsorSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(500),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
});
const sponsoredRewardSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(500),
  cost: z.number().int().min(1).max(100000),
  stock: z.number().int().min(0).max(100000),
  kind: z.enum(['CREDIT', 'VOUCHER', 'COSMETIC']),
  value: z.number().int().min(0).max(1000000),
});
const detail = {
  missions: { include: { participants: { select: { completedAt: true } } } },
  rewards: { include: { _count: { select: { redemptions: true } } } },
} as const;
function summary(
  sponsor: Awaited<ReturnType<typeof db.sponsor.findMany<{ include: typeof detail }>>>[number],
) {
  return {
    ...sponsor,
    rewards: sponsor.rewards.map((reward) => ({
      ...reward,
      redemptions: reward._count.redemptions,
      _count: undefined,
    })),
    missions: sponsor.missions.map((mission) => ({
      ...mission,
      participants: undefined,
      participantCount: mission.participants.length,
      completedCount: mission.participants.filter((entry) => entry.completedAt).length,
    })),
  };
}
export function sponsorsRouter(
  auth: RequestHandler,
  admin: RequestHandler,
  business: RequestHandler,
  broadcast: () => void,
) {
  const router = Router();
  router.get('/admin/sponsors', auth, admin, async (_req, res) =>
    res.json(
      (await db.sponsor.findMany({ include: detail, orderBy: { startsAt: 'desc' } })).map(summary),
    ),
  );
  router.get('/business/sponsors', auth, business, async (req, res) =>
    res.json(
      (
        await db.sponsor.findMany({
          where: { organizationId: req.viewer!.organizationId! },
          include: detail,
          orderBy: { startsAt: 'desc' },
        })
      ).map(summary),
    ),
  );
  router.post('/business/sponsors', auth, business, async (req, res) => {
    const data = sponsorSchema.parse(req.body);
    requireThat(
      new Date(data.endsAt) > new Date(data.startsAt) && new Date(data.endsAt) > new Date(),
      422,
      'Choose a valid sponsorship window.',
    );
    const result = await transaction(async (tx) => {
      const sponsor = await tx.sponsor.create({
        data: {
          ...data,
          startsAt: new Date(data.startsAt),
          endsAt: new Date(data.endsAt),
          organizationId: req.viewer!.organizationId!,
          status: 'PENDING',
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'SPONSOR_SUBMITTED',
          resource: sponsor.id,
          summary: `${sponsor.name}: demonstration profile submitted for approval.`,
        },
      });
      return sponsor;
    });
    broadcast();
    res.status(201).json(result);
  });
  router.post('/business/sponsors/:id/rewards', auth, business, async (req, res) => {
    const data = sponsoredRewardSchema.parse(req.body);
    const sponsor = await db.sponsor.findFirst({
      where: {
        id: String(req.params.id),
        organizationId: req.viewer!.organizationId!,
        status: 'APPROVED',
        startsAt: { lte: new Date() },
        endsAt: { gt: new Date() },
      },
    });
    requireThat(sponsor, 404, 'An active approved organization sponsor is required.');
    const reward = await transaction(async (tx) => {
      const created = await tx.reward.create({ data: { ...data, sponsorId: sponsor!.id } });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'SPONSORED_REWARD_CREATED',
          resource: created.id,
          summary: `${sponsor!.name}: ${created.name}, ${created.stock} units`,
        },
      });
      return created;
    });
    broadcast();
    res.status(201).json(reward);
  });
  router.patch('/business/sponsored-rewards/:id/stock', auth, business, async (req, res) => {
    const { stock } = z.object({ stock: z.number().int().min(0).max(100000) }).parse(req.body);
    const reward = await db.reward.findFirst({
      where: {
        id: String(req.params.id),
        sponsor: { organizationId: req.viewer!.organizationId! },
      },
    });
    requireThat(reward, 404, 'Sponsored reward not found.');
    const changed = await db.reward.updateMany({
      where: { id: reward!.id, stock: reward!.stock },
      data: { stock },
    });
    requireThat(changed.count, 409, 'Inventory changed; refresh and try again.');
    const updated = await db.reward.findUniqueOrThrow({ where: { id: reward!.id } });
    await db.auditLog.create({
      data: {
        actorId: req.viewer!.id,
        action: 'SPONSORED_REWARD_STOCK_UPDATED',
        resource: updated.id,
        summary: `${updated.name}: stock set to ${updated.stock}`,
      },
    });
    broadcast();
    res.json(updated);
  });
  router.patch('/admin/sponsors/:id', auth, admin, async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAUSED']) })
      .parse(req.body);
    const result = await transaction(async (tx) => {
      const sponsor = await tx.sponsor.update({
        where: { id: String(req.params.id) },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'SPONSOR_REVIEWED',
          resource: sponsor.id,
          summary: `${sponsor.name}: ${status}`,
        },
      });
      return sponsor;
    });
    broadcast();
    res.json(result);
  });
  router.post('/business/sponsored-missions', auth, business, async (req, res) => {
    const data = missionSchema.parse(req.body);
    requireThat(data.sponsorId, 422, 'Choose an approved sponsor.');
    const result = await transaction(async (tx) => {
      requireThat(
        await tx.sponsor.count({
          where: { id: data.sponsorId!, organizationId: req.viewer!.organizationId! },
        }),
        404,
        'Organization sponsor not found.',
      );
      const mission = await tx.mission.create({
        data: { ...(await validatedMission(tx, data)), status: 'DRAFT' },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'SPONSORED_MISSION_SUBMITTED',
          resource: mission.id,
          summary: `${mission.name}: awaits administrator publication.`,
        },
      });
      return mission;
    });
    broadcast();
    res.status(201).json(result);
  });
  return router;
}
