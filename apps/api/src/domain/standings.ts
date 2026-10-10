import { z } from 'zod/v4';
import { db } from '../db.js';
import { requireThat } from '../security.js';
import { weekKey } from './progression.js';

export const standingsSchema = z.object({
  metric: z.enum(['XP', 'DISTANCE', 'INFLUENCE', 'MISSIONS', 'TEAMS']).default('XP'),
  period: z.enum(['ALL', 'WEEK', 'MONTH']).default('ALL'),
  scope: z.enum(['GLOBAL', 'FRIENDS']).default('GLOBAL'),
  district: z.string().max(80).default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export async function standings(input: unknown, viewerId?: string) {
  const filter = standingsSchema.parse(input);
  const now = new Date();
  const local = new Date(now.getTime() + 5 * 3600000);
  const since =
    filter.period === 'WEEK'
      ? new Date(`${weekKey(now)}T00:00:00+05:00`)
      : filter.period === 'MONTH'
        ? new Date(`${local.toISOString().slice(0, 7)}-01T00:00:00+05:00`)
        : undefined;
  let ids: string[] | undefined;
  if (filter.scope === 'FRIENDS') {
    requireThat(viewerId, 401, 'Sign in to view friends standings.');
    const connections = await db.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: viewerId }, { addresseeId: viewerId }] },
    });
    ids = [
      viewerId!,
      ...connections.map((connection) =>
        connection.requesterId === viewerId ? connection.addresseeId : connection.requesterId,
      ),
    ];
  }
  const users = await db.user.findMany({
    where: {
      role: 'USER',
      status: 'ACTIVE',
      publicProfile: true,
      ...(ids ? { id: { in: ids } } : {}),
    },
    select: { id: true, name: true, xp: true, teamId: true, team: { select: { name: true } } },
  });
  const scores = new Map<string, number>();
  const eligible = {
    role: 'USER',
    status: 'ACTIVE',
    publicProfile: true,
    ...(ids ? { id: { in: ids } } : {}),
  };
  const rentalWhere = {
    state: 'COMPLETED',
    user: eligible,
    ...(since ? { endedAt: { gte: since } } : {}),
    ...(filter.district ? { station: { district: filter.district } } : {}),
  };
  if ((filter.metric === 'XP' || filter.metric === 'TEAMS') && !since && !filter.district) {
    for (const user of users) scores.set(user.id, user.xp);
  } else if (filter.metric === 'INFLUENCE') {
    const season = await db.season.findFirst({
      where: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gt: now } },
    });
    if (season) {
      const territory = filter.district ? { district: filter.district } : undefined;
      const entries = since
        ? await db.territoryContribution.groupBy({
            by: ['userId'],
            where: {
              user: eligible,
              seasonId: season.id,
              createdAt: { gte: since },
              ...(territory ? { territory } : {}),
            },
            _sum: { score: true },
          })
        : await db.territoryInfluence.groupBy({
            by: ['userId'],
            where: { user: eligible, seasonId: season.id, ...(territory ? { territory } : {}) },
            _sum: { score: true },
          });
      for (const entry of entries) scores.set(entry.userId, entry._sum.score || 0);
    }
  } else if (filter.metric === 'MISSIONS') {
    // Mission geography is not inferred from a rider's address or location.
    const entries = await db.userMission.groupBy({
      by: ['userId'],
      where: { user: eligible, completedAt: since ? { gte: since } : { not: null } },
      _count: true,
    });
    for (const entry of entries) scores.set(entry.userId, entry._count);
  } else {
    const entries = await db.rental.groupBy({
      by: ['userId'],
      where: rentalWhere,
      _sum: { distanceM: true, xp: true },
    });
    for (const entry of entries)
      scores.set(
        entry.userId,
        filter.metric === 'DISTANCE' ? entry._sum.distanceM || 0 : entry._sum.xp || 0,
      );
    // Time-window XP includes mission bonuses. District XP is ride XP earned at return stations.
    if (filter.metric !== 'DISTANCE' && !filter.district) {
      const missions = await db.userMission.findMany({
        where: { user: eligible, completedAt: since ? { gte: since } : { not: null } },
        select: { userId: true, mission: { select: { xp: true } } },
      });
      for (const mission of missions)
        scores.set(mission.userId, (scores.get(mission.userId) || 0) + mission.mission.xp);
    }
  }
  let rows = users.map((user) => ({
    id: user.id,
    name: user.name,
    xp: user.xp,
    team: user.team,
    score: scores.get(user.id) || 0,
  }));
  if (filter.metric === 'TEAMS') {
    const teamScores = new Map<string, (typeof rows)[number]>();
    for (const user of users)
      if (user.teamId && user.team) {
        const team = teamScores.get(user.teamId) || {
          id: user.teamId,
          name: user.team.name,
          xp: 0,
          team: null,
          score: 0,
        };
        team.xp += user.xp;
        team.score += scores.get(user.id) || 0;
        teamScores.set(user.teamId, team);
      }
    rows = [...teamScores.values()];
  }
  rows.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    entries: rows
      .slice((filter.page - 1) * 50, filter.page * 50)
      .map((row, index) => ({ ...row, rank: (filter.page - 1) * 50 + index + 1 })),
    total: rows.length,
    page: filter.page,
    pageSize: 50,
    basis:
      filter.metric === 'INFLUENCE'
        ? 'Current season influence; weekly and monthly views use trusted contribution history.'
        : filter.metric === 'MISSIONS'
          ? 'Completed missions. Mission standings span all districts.'
          : filter.district
            ? `Completed ride activity at return stations in ${filter.district}.`
            : 'Public active profiles only. Calendar periods use Tashkent time.',
  };
}
