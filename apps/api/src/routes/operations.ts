import { Router, type RequestHandler } from 'express';
import { z } from 'zod/v4';
import { db, transaction } from '../db.js';
import { requireThat } from '../security.js';
import {
  closeSeason,
  finalizeBattle,
  getRules,
  maintainCompetitions,
  requireTeamChangeAllowed,
  rulesSchema,
} from '../domain/competition.js';
import { StatisticalDemandProvider } from '../domain/intelligence.js';
import { weekKey } from '../domain/progression.js';

const teamSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(500),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
});
const rewardSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(500),
  cost: z.number().int().min(1).max(100000),
  stock: z.number().int().min(0).max(100000),
  kind: z.enum(['CREDIT', 'VOUCHER', 'COSMETIC']),
  value: z.number().int().min(0).max(1000000),
});
const seasonSchema = z.object({
  name: z.string().min(3).max(80),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
});
const battleSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  metric: z.enum(['DISTANCE', 'INFLUENCE']),
  rewardPoints: z.number().int().min(0).max(1000),
  teamIds: z.array(z.string()).min(2).max(30),
});

export function operationsRouter(
  auth: RequestHandler,
  admin: RequestHandler,
  broadcast: () => void,
  revoke: (userId: string) => void,
) {
  const router = Router();
  router.post('/profile/recovery-week', auth, async (req, res) => {
    const { resting } = z.object({ resting: z.boolean() }).parse(req.body);
    const result = await transaction(async (tx) => {
      const key = `recovery:${req.viewer!.id}`;
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const weeks = Array.isArray(existing?.value)
        ? existing.value.filter((value): value is string => typeof value === 'string')
        : [];
      const current = weekKey(new Date());
      const value = resting
        ? [...new Set([...weeks, current])]
        : weeks.filter((week) => week !== current);
      return tx.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    });
    res.json({ resting, updatedAt: result.updatedAt });
  });
  router.get('/territories/:id/history', async (req, res) => {
    const territory = await db.territory.findFirst({
      where: { id: String(req.params.id), enabled: true },
      select: { id: true, name: true },
    });
    requireThat(territory, 404, 'Territory not found.');
    const season = await db.season.findFirst({
      where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
    });
    const [leaders, contributions, ownership] = await Promise.all([
      db.territoryInfluence.findMany({
        where: { territoryId: territory!.id, seasonId: season?.id || 'no-active-season' },
        select: { score: true, user: { select: { name: true, publicProfile: true } } },
        orderBy: [{ score: 'desc' }, { userId: 'asc' }],
        take: 10,
      }),
      db.territoryContribution.findMany({
        where: { territoryId: territory!.id },
        select: {
          score: true,
          createdAt: true,
          user: { select: { name: true, publicProfile: true } },
          season: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.territoryOwnershipHistory.findMany({
        where: { territoryId: territory!.id },
        select: { createdAt: true, season: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    res.json({
      leaders: leaders.map((entry) => ({
        score: entry.score,
        name: entry.user.publicProfile ? entry.user.name : 'Private rider',
      })),
      contributions: contributions.map((entry) => ({
        score: entry.score,
        createdAt: entry.createdAt,
        name: entry.user.publicProfile ? entry.user.name : 'Private rider',
        season: entry.season.name,
      })),
      ownership,
    });
  });
  router.get('/profiles/:id', auth, async (req, res) => {
    const user = await db.user.findFirst({
      where: { id: String(req.params.id), role: 'USER', status: 'ACTIVE', publicProfile: true },
      select: {
        name: true,
        xp: true,
        team: { select: { name: true } },
        achievements: {
          select: { earnedAt: true, achievement: { select: { name: true, description: true } } },
          orderBy: { earnedAt: 'desc' },
        },
      },
    });
    requireThat(user, 404, 'This public profile is unavailable.');
    res.json(user);
  });
  router.get('/admin/intelligence', auth, admin, async (_req, res) =>
    res.json(await new StatisticalDemandProvider().forecast()),
  );
  router.patch('/admin/maintenance/:id', auth, admin, async (req, res) => {
    const data = z
      .object({
        severity: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
        technician: z.string().trim().max(80).nullable(),
        notes: z.string().trim().max(2000),
        status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
        takeOffline: z.boolean().default(false),
      })
      .parse(req.body);
    const result = await transaction(async (tx) => {
      const issue = await tx.maintenanceIssue.findUnique({
        where: { id: String(req.params.id) },
        include: { bike: true },
      });
      requireThat(issue, 404, 'Issue not found.');
      if (data.takeOffline) {
        requireThat(
          !['RESERVED', 'IN_USE'].includes(issue!.bike.status),
          409,
          'An active bike cannot be moved to maintenance.',
        );
        await tx.bicycle.update({ where: { id: issue!.bikeId }, data: { status: 'MAINTENANCE' } });
      }
      const { takeOffline: _takeOffline, ...fields } = data;
      const updated = await tx.maintenanceIssue.update({
        where: { id: issue!.id },
        data: { ...fields, resolvedAt: fields.status === 'RESOLVED' ? new Date() : null },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'MAINTENANCE_UPDATED',
          resource: issue!.id,
          summary: `${fields.status}: ${fields.severity}; ${fields.technician || 'unassigned'}`,
        },
      });
      return updated;
    });
    broadcast();
    res.json(result);
  });
  router.get('/admin/reports/:dataset.csv', auth, admin, async (req, res) => {
    const dataset = String(req.params.dataset);
    let headers: string[];
    let rows: unknown[][];
    if (dataset === 'inventory') {
      headers = ['bike', 'station', 'type', 'status', 'battery'];
      rows = (await db.bicycle.findMany({ include: { station: true }, take: 10000 })).map(
        (bike) => [bike.code, bike.station.name, bike.type, bike.status, bike.battery],
      );
    } else if (dataset === 'stations') {
      headers = ['station', 'district', 'latitude', 'longitude', 'capacity', 'enabled'];
      rows = (await db.station.findMany({ take: 10000 })).map((station) => [
        station.name,
        station.district,
        station.lat,
        station.lng,
        station.capacity,
        station.enabled,
      ]);
    } else if (dataset === 'missions') {
      headers = ['mission', 'category', 'status', 'target', 'participants', 'completed'];
      rows = (
        await db.mission.findMany({
          include: { participants: { select: { completedAt: true } } },
          take: 10000,
        })
      ).map((mission) => [
        mission.name,
        mission.category,
        mission.status,
        mission.target,
        mission.participants.length,
        mission.participants.filter((entry) => entry.completedAt).length,
      ]);
    } else if (dataset === 'territories') {
      headers = ['territory', 'district', 'enabled', 'contributions', 'total_influence'];
      rows = (
        await db.territory.findMany({
          include: {
            _count: { select: { contributions: true } },
            influence: { select: { score: true } },
          },
          take: 10000,
        })
      ).map((territory) => [
        territory.name,
        territory.district,
        territory.enabled,
        territory._count.contributions,
        territory.influence.reduce((sum, entry) => sum + entry.score, 0),
      ]);
    } else if (dataset === 'rewards') {
      headers = ['reward', 'loyalty_cost', 'stock', 'redemptions'];
      rows = (
        await db.reward.findMany({
          include: { _count: { select: { redemptions: true } } },
          take: 10000,
        })
      ).map((reward) => [reward.name, reward.cost, reward.stock, reward._count.redemptions]);
    } else if (dataset === 'revenue') {
      headers = ['kind', 'transactions', 'demo_net_wallet_change_uzs'];
      rows = (
        await db.walletTransaction.groupBy({ by: ['kind'], _sum: { amount: true }, _count: true })
      ).map((entry) => [entry.kind, entry._count, entry._sum.amount || 0]);
    } else if (dataset === 'activity') {
      headers = ['public_name', 'xp', 'completed_rides', 'completed_missions'];
      rows = (
        await db.user.findMany({
          where: { role: 'USER' },
          include: {
            _count: {
              select: {
                rentals: { where: { state: 'COMPLETED' } },
                missions: { where: { completedAt: { not: null } } },
              },
            },
          },
          take: 10000,
        })
      ).map((user) => [
        user.publicProfile ? user.name : 'Private rider',
        user.xp,
        user._count.rentals,
        user._count.missions,
      ]);
    } else {
      requireThat(false, 404, 'Report not found.');
      return;
    }
    const cell = (value: unknown) => {
      let string = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(string)) string = `'${string}`;
      return `"${string.replaceAll('"', '""')}"`;
    };
    res
      .type('text/csv')
      .attachment(`velocity-demo-${dataset}.csv`)
      .send([headers, ...rows].map((row) => row.map(cell).join(',')).join('\n'));
  });
  const audited = async (actorId: string, action: string, resource: string, summary: string) =>
    db.auditLog.create({ data: { actorId, action, resource, summary } });
  router.get('/battles', async (_req, res) => {
    await transaction(maintainCompetitions);
    res.json(
      await db.battle.findMany({
        where: { status: { not: 'DRAFT' } },
        include: {
          participants: {
            include: { team: { select: { id: true, name: true, color: true } } },
            orderBy: [{ score: 'desc' }, { teamId: 'asc' }],
          },
        },
        orderBy: { startsAt: 'desc' },
        take: 50,
      }),
    );
  });
  router.get('/seasons', async (_req, res) => {
    await transaction(maintainCompetitions);
    res.json(
      await db.season.findMany({
        include: { standings: { orderBy: { rank: 'asc' }, take: 50 } },
        orderBy: { startsAt: 'desc' },
      }),
    );
  });
  router.get('/admin/teams', auth, admin, async (_req, res) => {
    res.json(
      await db.team.findMany({
        include: { _count: { select: { users: true, participants: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  });
  router.post('/admin/teams', auth, admin, async (req, res) => {
    const result = await db.team.create({ data: teamSchema.parse(req.body) });
    await audited(req.viewer!.id, 'TEAM_CREATED', result.id, result.name);
    broadcast();
    res.status(201).json(result);
  });
  router.patch('/admin/teams/:id', auth, admin, async (req, res) => {
    const result = await db.team.update({
      where: { id: String(req.params.id) },
      data: teamSchema.parse(req.body),
    });
    await audited(req.viewer!.id, 'TEAM_UPDATED', result.id, result.name);
    broadcast();
    res.json(result);
  });
  router.get('/admin/rewards', auth, admin, async (_req, res) =>
    res.json(await db.reward.findMany({ orderBy: { cost: 'asc' } })),
  );
  router.post('/admin/rewards', auth, admin, async (req, res) => {
    const result = await db.reward.create({ data: rewardSchema.parse(req.body) });
    await audited(req.viewer!.id, 'REWARD_CREATED', result.id, result.name);
    broadcast();
    res.status(201).json(result);
  });
  router.patch('/admin/rewards/:id', auth, admin, async (req, res) => {
    const result = await db.reward.update({
      where: { id: String(req.params.id) },
      data: rewardSchema.parse(req.body),
    });
    await audited(req.viewer!.id, 'REWARD_UPDATED', result.id, result.name);
    broadcast();
    res.json(result);
  });
  router.get('/admin/territories', auth, admin, async (_req, res) =>
    res.json(
      await db.territory.findMany({
        include: {
          influence: {
            include: { user: { select: { name: true, publicProfile: true } } },
            orderBy: { score: 'desc' },
            take: 5,
          },
          ownership: { orderBy: { createdAt: 'desc' }, take: 5 },
          _count: { select: { contributions: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ),
  );
  router.patch('/admin/territories/:id', auth, admin, async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(3).max(80),
        district: z.string().trim().min(2).max(80),
        enabled: z.boolean(),
      })
      .parse(req.body);
    const result = await db.territory.update({ where: { id: String(req.params.id) }, data });
    await audited(
      req.viewer!.id,
      'TERRITORY_UPDATED',
      result.id,
      `${result.name}: ${result.enabled ? 'enabled' : 'disabled'}`,
    );
    broadcast();
    res.json(result);
  });
  router.get('/admin/seasons', auth, admin, async (_req, res) => {
    await transaction(maintainCompetitions);
    res.json(
      await db.season.findMany({
        include: { _count: { select: { standings: true, influence: true } } },
        orderBy: { startsAt: 'desc' },
      }),
    );
  });
  router.post('/admin/seasons', auth, admin, async (req, res) => {
    const data = seasonSchema.parse(req.body);
    const startsAt = new Date(data.startsAt),
      endsAt = new Date(data.endsAt);
    requireThat(
      endsAt > startsAt && endsAt > new Date(),
      422,
      'Choose a valid future season window.',
    );
    const result = await transaction(async (tx) => {
      await maintainCompetitions(tx);
      const overlap = await tx.season.count({
        where: { status: 'ACTIVE', startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      });
      requireThat(!overlap, 409, 'Season dates overlap an existing season.');
      const season = await tx.season.create({ data: { ...data, startsAt, endsAt } });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'SEASON_CREATED',
          resource: season.id,
          summary: season.name,
        },
      });
      return season;
    });
    broadcast();
    res.status(201).json(result);
  });
  router.post('/admin/seasons/:id/close', auth, admin, async (req, res) => {
    const result = await transaction(async (tx) => {
      const season = await closeSeason(tx, String(req.params.id));
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'SEASON_CLOSED',
          resource: season!.id,
          summary: 'Final standings frozen; lifetime XP preserved.',
        },
      });
      return season;
    });
    broadcast();
    res.json(result);
  });
  router.get('/admin/challenges', auth, admin, async (_req, res) => {
    await transaction(maintainCompetitions);
    res.json(
      await db.battle.findMany({
        include: { participants: { include: { team: true } } },
        orderBy: { startsAt: 'desc' },
      }),
    );
  });
  router.post('/admin/challenges', auth, admin, async (req, res) => {
    const data = battleSchema.parse(req.body);
    const startsAt = new Date(data.startsAt),
      endsAt = new Date(data.endsAt);
    requireThat(endsAt > startsAt && endsAt > new Date(), 422, 'Choose valid competition dates.');
    requireThat(new Set(data.teamIds).size === data.teamIds.length, 422, 'Choose distinct teams.');
    requireThat(
      (await db.team.count({ where: { id: { in: data.teamIds } } })) === data.teamIds.length,
      422,
      'One or more teams are unavailable.',
    );
    const { teamIds, ...fields } = data;
    const result = await db.battle.create({
      data: {
        ...fields,
        startsAt,
        endsAt,
        participants: { create: teamIds.map((teamId) => ({ teamId })) },
      },
    });
    await audited(req.viewer!.id, 'BATTLE_CREATED', result.id, result.name);
    res.status(201).json(result);
  });
  router.post('/admin/challenges/:id/activate', auth, admin, async (req, res) => {
    const result = await transaction(async (tx) => {
      const battle = await tx.battle.findUnique({ where: { id: String(req.params.id) } });
      requireThat(
        battle?.status === 'DRAFT' && battle.endsAt > new Date(),
        409,
        'Competition cannot be activated.',
      );
      const updated = await tx.battle.update({
        where: { id: battle!.id },
        data: {
          status: 'ACTIVE',
          startsAt: battle!.startsAt < new Date() ? new Date() : battle!.startsAt,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'BATTLE_ACTIVATED',
          resource: updated.id,
          summary: updated.name,
        },
      });
      return updated;
    });
    broadcast();
    res.json(result);
  });
  router.post('/admin/challenges/:id/close', auth, admin, async (req, res) => {
    const result = await transaction(async (tx) => {
      const battle = await tx.battle.findUnique({ where: { id: String(req.params.id) } });
      requireThat(
        battle && ['ACTIVE', 'COMPLETED'].includes(battle.status),
        409,
        'Activate a competition before closing it.',
      );
      const completed = await finalizeBattle(tx, battle!.id);
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'BATTLE_COMPLETED',
          resource: battle!.id,
          summary: 'Rankings and contributor rewards finalized.',
        },
      });
      return completed;
    });
    broadcast();
    res.json(result);
  });
  router.get('/admin/settings', auth, admin, async (_req, res) => res.json(await getRules(db)));
  router.patch('/admin/settings', auth, admin, async (req, res) => {
    const data = rulesSchema.parse(req.body);
    await transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: 'rules' },
        create: { key: 'rules', value: data },
        update: { value: data },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'RULES_UPDATED',
          resource: 'rules',
          summary: JSON.stringify(data),
        },
      });
    });
    broadcast();
    res.json(data);
  });
  router.patch('/admin/users/:id', auth, admin, async (req, res) => {
    const data = z
      .object({
        status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
        role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'BUSINESS_ADMIN']).optional(),
      })
      .parse(req.body);
    requireThat(Object.keys(data).length > 0, 422, 'Choose a change.');
    const target = await db.user.findUnique({ where: { id: String(req.params.id) } });
    requireThat(target, 404, 'User not found.');
    requireThat(target!.id !== req.viewer!.id, 422, 'Your own role and status are protected.');
    requireThat(
      req.viewer!.role === 'SUPER_ADMIN' || (!data.role && target!.role === 'USER'),
      403,
      'Only a super administrator can change roles or manage privileged accounts.',
    );
    requireThat(
      data.role !== 'BUSINESS_ADMIN' || target!.organizationId,
      422,
      'Connect an organization before granting this role.',
    );
    await transaction(async (tx) => {
      await tx.user.update({ where: { id: target!.id }, data });
      if (data.status === 'SUSPENDED' || data.role)
        await tx.session.deleteMany({ where: { userId: target!.id } });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'USER_ACCESS_UPDATED',
          resource: target!.id,
          summary: JSON.stringify(data),
        },
      });
    });
    revoke(target!.id);
    res.json({ ok: true });
  });
  router.get('/invitations', auth, async (req, res) =>
    res.json(
      await db.membershipInvitation.findMany({
        where: { userId: req.viewer!.id, status: 'PENDING', expiresAt: { gt: new Date() } },
        include: { team: true, organization: true, sender: { select: { name: true } } },
      }),
    ),
  );
  router.post('/teams/:id/invite', auth, async (req, res) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const teamId = String(req.params.id);
    requireThat(req.viewer!.teamId === teamId, 403, 'Join this team before inviting someone.');
    requireThat(
      userId !== req.viewer!.id &&
        (await db.user.count({ where: { id: userId, role: 'USER', publicProfile: true } })),
      404,
      'Public rider not found.',
    );
    requireThat(
      !(await db.membershipInvitation.count({
        where: { userId, teamId, status: 'PENDING', expiresAt: { gt: new Date() } },
      })),
      409,
      'An invitation is already pending.',
    );
    const result = await db.membershipInvitation.create({
      data: {
        senderId: req.viewer!.id,
        userId,
        teamId,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    await db.notification.create({
      data: {
        userId,
        title: 'Team invitation',
        body: `${req.viewer!.name} invited you to a community. Open your invitations to respond.`,
      },
    });
    res.status(201).json(result);
  });
  router.post('/invitations/:id/respond', auth, async (req, res) => {
    const { accept } = z.object({ accept: z.boolean() }).parse(req.body);
    const result = await transaction(async (tx) => {
      const invitation = await tx.membershipInvitation.findUnique({
        where: { id: String(req.params.id) },
      });
      requireThat(
        invitation &&
          invitation.userId === req.viewer!.id &&
          invitation.status === 'PENDING' &&
          invitation.expiresAt > new Date(),
        404,
        'Invitation is unavailable.',
      );
      if (accept && invitation!.teamId) {
        await requireTeamChangeAllowed(tx, req.viewer!.id);
        await tx.user.update({
          where: { id: req.viewer!.id },
          data: { teamId: invitation!.teamId },
        });
      }
      if (accept && invitation!.organizationId) {
        const user = await tx.user.findUniqueOrThrow({ where: { id: req.viewer!.id } });
        requireThat(!user.organizationId, 409, 'Leave the current organization before accepting.');
        await tx.user.update({
          where: { id: user.id },
          data: { organizationId: invitation!.organizationId },
        });
      }
      return tx.membershipInvitation.update({
        where: { id: invitation!.id },
        data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
      });
    });
    broadcast();
    res.json(result);
  });
  router.patch('/notifications/preferences', auth, async (req, res) => {
    const data = z.object({ community: z.boolean(), marketing: z.boolean() }).parse(req.body);
    await db.user.update({
      where: { id: req.viewer!.id },
      data: { notificationPreferences: data },
    });
    res.json(data);
  });
  return router;
}
