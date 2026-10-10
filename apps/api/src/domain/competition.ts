import { z } from 'zod/v4';
import type { Transaction } from '../db';
import { requireThat } from '../security';
import { awardAchievement } from './progression';

export const rulesSchema = z.object({
  unlockFee: z.number().int().min(0).max(100000),
  perMinute: z.number().int().min(0).max(10000),
  dailyXpCap: z.number().int().min(10).max(10000),
  dailyInfluenceCap: z.number().int().min(1).max(1000),
  territoryCooldownMinutes: z.number().int().min(0).max(1440),
});
export const defaultRules = {
  unlockFee: 2000,
  perMinute: 400,
  dailyXpCap: 1000,
  dailyInfluenceCap: 100,
  territoryCooldownMinutes: 30,
};
export async function getRules(tx: Transaction) {
  const stored = await tx.systemSetting.findUnique({ where: { key: 'rules' } });
  return stored ? rulesSchema.parse(stored.value) : defaultRules;
}

export async function closeSeason(tx: Transaction, seasonId: string, now = new Date()) {
  const season = await tx.season.findUnique({
    where: { id: seasonId },
    include: { standings: true },
  });
  requireThat(season, 404, 'Season not found.');
  if (season!.status === 'CLOSED') return season;
  const scores = await tx.territoryInfluence.groupBy({
    by: ['userId'],
    where: { seasonId },
    _sum: { score: true },
  });
  const ranked = scores.sort(
    (a, b) => (b._sum.score || 0) - (a._sum.score || 0) || a.userId.localeCompare(b.userId),
  );
  for (const [index, entry] of ranked.entries()) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: entry.userId } });
    await tx.seasonStanding.create({
      data: {
        seasonId,
        userId: user.id,
        name: user.publicProfile ? user.name : 'Private rider',
        rank: index + 1,
        score: entry._sum.score || 0,
      },
    });
    await tx.notification.create({
      data: {
        userId: user.id,
        category: 'COMMUNITY',
        title: 'Season results are ready',
        body: `${season!.name}: #${index + 1} with ${entry._sum.score || 0} influence.`,
      },
    });
    if (index === 0 && (entry._sum.score || 0) > 0)
      await awardAchievement(tx, user.id, 'season-champion');
  }
  return tx.season.update({
    where: { id: seasonId },
    data: { status: 'CLOSED', endsAt: now < season!.endsAt ? now : season!.endsAt },
  });
}

export async function finalizeBattle(tx: Transaction, battleId: string, now = new Date()) {
  const battle = await tx.battle.findUnique({
    where: { id: battleId },
    include: { participants: { include: { scores: true } } },
  });
  requireThat(battle, 404, 'Competition not found.');
  if (battle!.finalizedAt) return battle;
  const ranked = [...battle!.participants].sort(
    (a, b) => b.score - a.score || a.teamId.localeCompare(b.teamId),
  );
  for (const [index, participant] of ranked.entries()) {
    await tx.battleParticipant.update({ where: { id: participant.id }, data: { rank: index + 1 } });
    const contributors = [...new Set(participant.scores.map((entry) => entry.userId))];
    for (const userId of contributors) {
      if (index === 0 && participant.score > 0) await awardAchievement(tx, userId, 'team-champion');
      if (index === 0 && participant.score > 0 && battle!.rewardPoints)
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: battle!.rewardPoints } },
        });
      await tx.notification.create({
        data: {
          userId,
          category: 'COMMUNITY',
          title: 'Competition results',
          body: `${battle!.name}: your team finished #${index + 1}.${index === 0 && participant.score > 0 ? ` +${battle!.rewardPoints} loyalty points.` : ''}`,
        },
      });
    }
  }
  return tx.battle.update({
    where: { id: battleId },
    data: {
      status: 'COMPLETED',
      finalizedAt: now,
      endsAt: now < battle!.endsAt ? now : battle!.endsAt,
    },
  });
}

export async function maintainCompetitions(tx: Transaction, now = new Date()) {
  for (const season of await tx.season.findMany({
    where: { status: 'ACTIVE', endsAt: { lte: now } },
  }))
    await closeSeason(tx, season.id, now);
  for (const battle of await tx.battle.findMany({
    where: { status: 'ACTIVE', endsAt: { lte: now }, finalizedAt: null },
  }))
    await finalizeBattle(tx, battle.id, now);
}

export async function scoreBattles(
  tx: Transaction,
  rentalId: string,
  userId: string,
  distanceM: number,
  influence: number,
) {
  const rental = await tx.rental.findUniqueOrThrow({ where: { id: rentalId } });
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.teamId || !rental.startedAt || !rental.endedAt) return;
  const participants = await tx.battleParticipant.findMany({
    where: {
      teamId: user.teamId,
      battle: {
        status: 'ACTIVE',
        startsAt: { lte: rental.startedAt },
        endsAt: { gt: rental.endedAt },
        finalizedAt: null,
      },
    },
    include: { battle: true },
  });
  for (const participant of participants) {
    const score = participant.battle.metric === 'INFLUENCE' ? influence : distanceM;
    if (!score) continue;
    await tx.battleScore.create({
      data: { participantId: participant.id, rentalId, userId, score },
    });
    await tx.battleParticipant.update({
      where: { id: participant.id },
      data: { score: { increment: score } },
    });
  }
}

export async function requireTeamChangeAllowed(tx: Transaction, userId: string) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const activeRide = await tx.rental.count({
    where: { userId, state: { in: ['RESERVED', 'ACTIVE'] } },
  });
  requireThat(!activeRide, 409, 'Finish or cancel your current ride before changing teams.');
  if (user.teamId) {
    const battle = await tx.battleParticipant.count({
      where: {
        teamId: user.teamId,
        battle: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gt: now } },
      },
    });
    requireThat(!battle, 409, 'Team membership is locked during an active competition.');
  }
}
