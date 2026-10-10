import { db } from '../db';
import { safeUser } from '../security';
import { getRules } from './competition';
import { weeklyConsistency } from './progression';
export async function catalog() {
  const [stations, bikes, territories, missions, season, landmarks, rewards, teams, activity] =
    await Promise.all([
      db.station.findMany({
        where: { enabled: true },
        include: { _count: { select: { bikes: true } } },
      }),
      db.bicycle.findMany({ include: { station: true }, orderBy: { code: 'asc' } }),
      db.territory.findMany({
        where: { enabled: true },
        include: {
          influence: {
            include: {
              user: { select: { id: true, name: true, teamId: true, publicProfile: true } },
              season: true,
            },
            where: {
              season: {
                status: 'ACTIVE',
                startsAt: { lte: new Date() },
                endsAt: { gt: new Date() },
              },
            },
            orderBy: [{ score: 'desc' }, { userId: 'asc' }],
          },
        },
      }),
      db.mission.findMany({
        where: {
          status: 'PUBLISHED',
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
          OR: [
            { sponsorId: null },
            {
              sponsor: {
                status: 'APPROVED',
                startsAt: { lte: new Date() },
                endsAt: { gt: new Date() },
              },
            },
          ],
        },
        include: {
          _count: { select: { participants: true } },
          sponsor: { select: { name: true, description: true, color: true } },
        },
      }),
      db.season.findFirst({
        where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
      }),
      db.landmark.findMany(),
      db.reward.findMany(),
      db.team.findMany({
        include: { _count: { select: { users: true } }, users: { select: { xp: true } } },
      }),
      db.rental.aggregate({
        where: { state: 'COMPLETED' },
        _sum: { distanceM: true },
        _count: true,
      }),
    ]);
  return {
    pricing: await getRules(db),
    achievements: await db.achievement.findMany({ orderBy: { name: 'asc' } }),
    stations,
    bikes,
    territories: territories.map((t) => {
      const influence = t.influence.filter(
        (i) =>
          i.season.status === 'ACTIVE' &&
          i.season.startsAt <= new Date() &&
          i.season.endsAt > new Date(),
      );
      const lead = influence[0];
      return {
        ...t,
        influence: undefined,
        score: influence.reduce((a, b) => a + b.score, 0),
        controller: lead ? (lead.user.publicProfile ? lead.user.name : 'Private rider') : null,
        controllerId: lead?.user.id,
        teamId: lead?.user.teamId,
      };
    }),
    missions,
    season,
    landmarks,
    rewards,
    teams: teams.map((t) => ({
      ...t,
      users: undefined,
      xp: t.users.reduce((sum, u) => sum + u.xp, 0),
    })),
    stats: {
      totalRides: activity._count,
      distanceKm: (activity._sum.distanceM || 0) / 1000,
      stations: stations.length,
      available: bikes.filter((b) => b.status === 'AVAILABLE').length,
    },
    demo: true,
  };
}
export async function dashboard(userId: string, days = 7) {
  const [
    user,
    rides,
    missions,
    influence,
    stamps,
    achievements,
    notifications,
    active,
    redemptions,
    transactions,
  ] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.rental.findMany({
      where: { userId, state: 'COMPLETED' },
      include: { bike: true, station: true },
      orderBy: { endedAt: 'desc' },
      take: 366,
    }),
    db.userMission.findMany({ where: { userId }, include: { mission: true } }),
    db.territoryInfluence.findMany({
      where: {
        userId,
        season: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
      },
      include: { territory: true },
    }),
    db.passportStamp.findMany({ where: { userId }, include: { landmark: true } }),
    db.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.rental.findFirst({
      where: { userId, state: { in: ['RESERVED', 'ACTIVE'] } },
      include: { bike: { include: { station: true } } },
    }),
    db.rewardRedemption.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.walletTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const totals = await db.rental.aggregate({
    where: { userId, state: 'COMPLETED' },
    _sum: { distanceM: true, durationSec: true },
    _count: true,
  });
  const distanceKm = (totals._sum.distanceM || 0) / 1000;
  const weekStart = new Date(Date.now() - 7 * 86400000);
  const weekly = rides.filter((r) => r.endedAt && r.endedAt >= weekStart);
  const weeklyKm = weekly.reduce((s, r) => s + r.distanceM, 0) / 1000;
  const chart = Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    const data = rides.filter((r) => r.endedAt?.toISOString().slice(0, 10) === date);
    return {
      date,
      day: new Date(date).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
      distance: +(data.reduce((s, r) => s + r.distanceM, 0) / 1000).toFixed(2),
    };
  });
  const rank = (await db.user.count({ where: { xp: { gt: user.xp }, role: 'USER' } })) + 1;
  const recovery = await db.systemSetting.findUnique({ where: { key: `recovery:${userId}` } });
  const recoveryWeeks = Array.isArray(recovery?.value)
    ? recovery.value.filter((value): value is string => typeof value === 'string')
    : [];
  const streaks = weeklyConsistency(
    await db.rental.findMany({
      where: { userId, state: 'COMPLETED' },
      select: { endedAt: true, distanceM: true },
    }),
    user.weeklyGoal,
    new Date(),
    recoveryWeeks,
  );
  const territoryLeaders = await db.territory.findMany({
    where: { enabled: true },
    select: {
      influence: {
        where: {
          season: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
        },
        orderBy: [{ score: 'desc' }, { userId: 'asc' }],
        take: 1,
        select: { userId: true, score: true },
      },
    },
  });
  return {
    user: safeUser(user),
    streaks,
    stats: {
      distanceKm,
      durationHours: (totals._sum.durationSec || 0) / 3600,
      rides: totals._count,
      influence: influence.reduce((s, i) => s + i.score, 0),
      controlledTerritories: territoryLeaders.filter(
        (entry) => entry.influence[0]?.userId === userId && entry.influence[0].score > 0,
      ).length,
      completedMissions: missions.filter((m) => m.completedAt).length,
      caloriesEstimate: Math.round(distanceKm * 30),
      co2EstimateKg: +(distanceKm * 0.16).toFixed(1),
      weeklyKm,
      activeDays: new Set(weekly.map((r) => r.endedAt?.toISOString().slice(0, 10))).size,
      rank,
    },
    chart,
    rides: rides.slice(0, 20),
    missions,
    influence,
    stamps,
    achievements,
    notifications: notifications.filter((notification) => {
      const preferences = user.notificationPreferences as {
        community?: boolean;
        marketing?: boolean;
      } | null;
      return notification.category === 'COMMUNITY'
        ? preferences?.community !== false
        : notification.category === 'MARKETING'
          ? preferences?.marketing === true
          : true;
    }),
    active,
    redemptions,
    transactions,
  };
}
export async function analytics(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const [bikes, users, rentals, missions, redemptions, issues, audits] = await Promise.all([
    db.bicycle.findMany({ include: { station: true } }),
    db.user.count(),
    db.rental.findMany({
      where: { state: 'COMPLETED', endedAt: { gte: since } },
      include: { bike: { include: { station: true } } },
      orderBy: { endedAt: 'desc' },
    }),
    db.userMission.count({ where: { completedAt: { not: null } } }),
    db.rewardRedemption.count(),
    db.maintenanceIssue.findMany({ include: { bike: true }, orderBy: { createdAt: 'desc' } }),
    db.auditLog.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  const revenue = rentals.reduce((sum, r) => sum + r.price, 0);
  const chart = Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    const data = rentals.filter((r) => r.endedAt?.toISOString().slice(0, 10) === date);
    return { date, rides: data.length, revenue: data.reduce((s, r) => s + r.price, 0) };
  });
  return {
    stats: {
      bikes: bikes.length,
      available: bikes.filter((b) => b.status === 'AVAILABLE').length,
      reserved: bikes.filter((b) => b.status === 'RESERVED').length,
      active: bikes.filter((b) => b.status === 'IN_USE').length,
      maintenance: bikes.filter((b) => b.status === 'MAINTENANCE').length,
      users,
      rides: rentals.length,
      revenue,
      averageDuration: rentals.length
        ? Math.round(rentals.reduce((s, r) => s + r.durationSec, 0) / rentals.length / 60)
        : 0,
      activeUsers: new Set(rentals.map((r) => r.userId)).size,
      utilization: bikes.length
        ? Math.round((new Set(rentals.map((r) => r.bikeId)).size / bikes.length) * 100)
        : 0,
      missions,
      redemptions,
    },
    chart,
    rentals: rentals.slice(0, 100),
    issues,
    audits,
    stationDemand: [...new Set(bikes.map((b) => b.station.name))].map((name) => ({
      name,
      rides: rentals.filter((r) => r.bike.station.name === name).length,
    })),
  };
}
