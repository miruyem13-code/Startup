import type { Transaction } from '../db.js';

export const achievementDefinitions = [
  {
    id: 'first-ride',
    name: 'A new beginning',
    description: 'Complete a ride of at least 100 meters.',
  },
  {
    id: 'distance-10',
    name: '10 KM Club',
    description: 'Complete 10 kilometers across your rides.',
  },
  {
    id: 'distance-100',
    name: '100 KM Club',
    description: 'Complete 100 kilometers across your rides.',
  },
  {
    id: 'explorer',
    name: 'City Explorer',
    description: 'Collect three different landmark stamps.',
  },
  {
    id: 'territory-master',
    name: 'Territory Master',
    description: 'Contribute trusted ride influence to ten different territories.',
  },
  { id: 'mission-specialist', name: 'Mission Specialist', description: 'Complete five missions.' },
  {
    id: 'team-champion',
    name: 'Team Champion',
    description: 'Contribute to a winning registered team competition.',
  },
  {
    id: 'consistency',
    name: 'Consistency Champion',
    description: 'Ride in four consecutive calendar weeks. Rest days are welcome.',
  },
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Complete a ride with an account created in the first 30 days of this city pilot.',
  },
  {
    id: 'season-champion',
    name: 'City Champion',
    description: 'Finish first in a closed season with positive influence.',
  },
];

const dayMs = 86400000;
// Tashkent calendar weeks start Monday. UTC+5 has no daylight saving changes.
export function weekKey(date: Date) {
  const local = new Date(date.getTime() + 5 * 3600000);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  return local.toISOString().slice(0, 10);
}
export function weeklyConsistency(
  rides: { endedAt: Date | null; distanceM: number }[],
  goalKm: number,
  now = new Date(),
  recoveryWeeks: string[] = [],
) {
  const totals = new Map<string, { meters: number; rides: number }>();
  for (const ride of rides) {
    if (!ride.endedAt || ride.endedAt > now) continue;
    const key = weekKey(ride.endedAt);
    const total = totals.get(key) || { meters: 0, rides: 0 };
    total.meters += ride.distanceM;
    total.rides++;
    totals.set(key, total);
  }
  const currentWeek = weekKey(now);
  const previousWeek = new Date(new Date(currentWeek).getTime() - 7 * dayMs)
    .toISOString()
    .slice(0, 10);
  function streak(predicate: (total: { meters: number; rides: number }) => boolean) {
    const qualified = [...totals.entries()]
      .filter(([, total]) => predicate(total))
      .map(([key]) => key)
      .sort();
    let best = 0,
      run = 0,
      previous = '';
    const keys = new Set(qualified);
    const recovery = new Set(recoveryWeeks.filter((key) => key <= currentWeek));
    for (const key of [...new Set([...qualified, ...recovery])].sort()) {
      if (previous && new Date(key).getTime() - new Date(previous).getTime() !== 7 * dayMs) run = 0;
      if (keys.has(key)) run++;
      best = Math.max(best, run);
      previous = key;
    }
    // An unfinished current week never erases the streak earned through last week.
    let cursor = keys.has(currentWeek) || recovery.has(currentWeek) ? currentWeek : previousWeek;
    let current = 0;
    while (keys.has(cursor) || recovery.has(cursor)) {
      if (keys.has(cursor)) current++;
      cursor = new Date(new Date(cursor).getTime() - 7 * dayMs).toISOString().slice(0, 10);
    }
    return { current, best };
  }
  return {
    activity: streak((total) => total.rides > 0),
    goal: streak((total) => total.meters >= goalKm * 1000),
    weekKm: (totals.get(currentWeek)?.meters || 0) / 1000,
    weekStart: currentWeek,
    goalKm,
    goalBasis: 'Completed distances compared with your current weekly goal.',
    recoveryThisWeek: recoveryWeeks.includes(currentWeek),
  };
}

export async function awardAchievement(tx: Transaction, userId: string, achievementId: string) {
  const definition = achievementDefinitions.find((achievement) => achievement.id === achievementId);
  if (!definition) return;
  const exists = await tx.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
  });
  if (exists) return;
  await tx.achievement.upsert({ where: { id: achievementId }, create: definition, update: {} });
  await tx.userAchievement.create({ data: { userId, achievementId } });
  // Cosmetic recognition only: achievement awards do not multiply competitive scoring.
  await tx.notification.create({
    data: { userId, title: 'Achievement unlocked', body: definition.name },
  });
}

export async function evaluateProgression(tx: Transaction, userId: string) {
  const [user, rides, stamps, missions, contributions, pilotStart] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: userId } }),
    tx.rental.findMany({
      where: { userId, state: 'COMPLETED' },
      select: { endedAt: true, distanceM: true },
    }),
    tx.passportStamp.count({ where: { userId } }),
    tx.userMission.count({ where: { userId, completedAt: { not: null } } }),
    tx.territoryContribution.findMany({
      where: { userId },
      distinct: ['territoryId'],
      select: { territoryId: true },
    }),
    tx.user.findFirst({
      where: { role: 'USER' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);
  const distance = rides.reduce((sum, ride) => sum + ride.distanceM, 0);
  const recovery = await tx.systemSetting.findUnique({ where: { key: `recovery:${userId}` } });
  const recoveryWeeks = Array.isArray(recovery?.value)
    ? recovery.value.filter((value): value is string => typeof value === 'string')
    : [];
  const eligible = [
    ['first-ride', rides.some((ride) => ride.distanceM >= 100)],
    ['distance-10', distance >= 10000],
    ['distance-100', distance >= 100000],
    ['explorer', stamps >= 3],
    ['territory-master', contributions.length >= 10],
    ['mission-specialist', missions >= 5],
    [
      'consistency',
      weeklyConsistency(rides, user.weeklyGoal, new Date(), recoveryWeeks).activity.best >= 4,
    ],
    [
      'early-adopter',
      rides.length > 0 &&
        !!pilotStart &&
        user.createdAt.getTime() < pilotStart.createdAt.getTime() + 30 * dayMs,
    ],
  ] as const;
  for (const [id, qualified] of eligible) if (qualified) await awardAchievement(tx, userId, id);
}
