import * as turf from '@turf/turf';
import { DEMO_ROUTE, PRICING, missionEligibilitySchema } from '../../../../packages/shared/schemas.js';
import type { Transaction } from '../db.js';
import { requireThat } from '../security.js';
import { getRules, maintainCompetitions, scoreBattles } from './competition.js';
import { evaluateProgression } from './progression.js';
export interface LockAdapter {
  unlock(bikeId: string): Promise<{ simulated: boolean }>;
}
export class DemoLock implements LockAdapter {
  async unlock(_bikeId: string) {
    return { simulated: true };
  }
}
export const priceFor = (
  seconds: number,
  unlock: number = PRICING.unlock,
  rate: number = PRICING.perMinute,
) => unlock + Math.ceil(seconds / 60) * rate;
export function validatePoint(previous: [number, number], next: [number, number], seconds: number) {
  requireThat(Number.isFinite(seconds) && seconds > 0, 422, 'Invalid timestamp.');
  const meters = Math.round(turf.distance(previous, next, { units: 'kilometers' }) * 1000);
  requireThat(
    meters > 0 && meters / seconds < 12,
    422,
    'Duplicate point or implausible GPS movement.',
  );
  return meters;
}
export async function expireReservations(tx: Transaction) {
  const expired = await tx.rental.findMany({
    where: { state: 'RESERVED', expiresAt: { lt: new Date() } },
  });
  for (const rental of expired) {
    await tx.rental.update({ where: { id: rental.id }, data: { state: 'EXPIRED' } });
    await tx.bicycle.updateMany({
      where: { id: rental.bikeId, status: 'RESERVED' },
      data: { status: 'AVAILABLE' },
    });
  }
}
export async function advanceRide(
  tx: Transaction,
  id: string,
  userId: string,
  expectedStep: number,
) {
  const ride = await tx.rental.findUnique({ where: { id } });
  requireThat(ride && ride.userId === userId, 404, 'Ride not found.');
  requireThat(ride!.state === 'ACTIVE' && !ride!.simulationPaused, 409, 'Ride is not running.');
  requireThat(ride!.step === expectedStep, 409, 'Ride already advanced. Refresh to continue.');
  requireThat(
    ride!.step < DEMO_ROUTE.length - 1,
    409,
    'Route complete. Park at Amir Temur station to finish.',
  );
  const step = ride!.step + 1;
  const meters = validatePoint(DEMO_ROUTE[step - 1], DEMO_ROUTE[step], 90);
  await tx.ridePoint.create({
    data: {
      rentalId: id,
      step,
      lng: DEMO_ROUTE[step][0],
      lat: DEMO_ROUTE[step][1],
      elapsedSec: step * 90,
    },
  });
  return tx.rental.update({
    where: { id },
    data: { step, distanceM: { increment: meters }, durationSec: { increment: 90 } },
  });
}
export async function finishRide(tx: Transaction, id: string, userId: string, stationId: string) {
  await maintainCompetitions(tx);
  const ride = await tx.rental.findUnique({ where: { id } });
  requireThat(ride && ride.userId === userId, 404, 'Ride not found.');
  if (ride!.state === 'COMPLETED') return ride!;
  requireThat(ride!.state === 'ACTIVE', 409, 'Ride is not active.');
  requireThat(
    ride!.distanceM >= 100 && ride!.durationSec >= 60,
    422,
    'Ride at least 100 meters before completing a journey.',
  );
  const station = await tx.station.findUnique({
    where: { id: stationId },
    include: { bikes: true },
  });
  requireThat(station && station.enabled, 422, 'Choose an enabled station.');
  requireThat(
    station!.bikes.filter((b) => b.id !== ride!.bikeId && b.status !== 'IN_USE').length <
      station!.capacity,
    409,
    'Station has no parking capacity.',
  );
  const point = DEMO_ROUTE[ride!.step];
  requireThat(
    turf.distance(point, [station!.lng, station!.lat], { units: 'meters' }) <= 300,
    422,
    'Park within 300 m of the selected station. Continue the demo loop to return.',
  );
  const price = priceFor(ride!.durationSec, ride!.unlockFee, ride!.perMinute);
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const rules = await getRules(tx);
  requireThat(user.wallet >= price, 422, 'Insufficient demo balance. Add demo credit in Wallet.');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const prior = await tx.rental.aggregate({
    where: { userId, state: 'COMPLETED', endedAt: { gte: today } },
    _sum: { xp: true, influence: true },
  });
  const xp = Math.max(
    0,
    Math.min(Math.floor(ride!.distanceM / 100) * 10, rules.dailyXpCap - (prior._sum.xp || 0)),
  );
  let influence = Math.max(
    0,
    Math.min(
      Math.floor(ride!.distanceM / 100),
      rules.dailyInfluenceCap - (prior._sum.influence || 0),
    ),
  );
  const result = await tx.rental.update({
    where: { id },
    data: { state: 'COMPLETED', endedAt: new Date(), stationId, price, xp, influence },
  });
  await tx.bicycle.update({
    where: { id: ride!.bikeId },
    data: { status: 'AVAILABLE', stationId },
  });
  await tx.user.update({
    where: { id: userId },
    data: {
      wallet: { decrement: price },
      xp: { increment: xp },
      points: { increment: Math.floor(xp / 10) },
    },
  });
  await tx.walletTransaction.create({
    data: { userId, amount: -price, kind: 'DEMO_RENTAL', reference: id },
  });
  const season = await tx.season.findFirst({
    where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
  });
  const territories = await tx.territory.findMany({ where: { enabled: true } });
  const points = DEMO_ROUTE.slice(0, ride!.step + 1);
  const touched = territories.filter((t) =>
    points.some((p) =>
      turf.booleanPointInPolygon(turf.point(p), t.geometry as unknown as GeoJSON.Polygon),
    ),
  );
  const recent = await tx.territoryContribution.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - rules.territoryCooldownMinutes * 60000) },
    },
    select: { territoryId: true },
  });
  const eligible = touched.filter(
    (territory) => !recent.some((entry) => entry.territoryId === territory.id),
  );
  if (!season || !eligible.length) influence = 0;
  await tx.rental.update({ where: { id }, data: { influence } });
  if (season && influence)
    for (const [index, territory] of eligible.entries()) {
      const score =
        Math.floor(influence / eligible.length) + (index < influence % eligible.length ? 1 : 0);
      if (!score) continue;
      const previous = await tx.territoryInfluence.findFirst({
        where: { territoryId: territory.id, seasonId: season.id },
        orderBy: [{ score: 'desc' }, { userId: 'asc' }],
      });
      await tx.territoryContribution.create({
        data: { rentalId: id, userId, territoryId: territory.id, seasonId: season.id, score },
      });
      await tx.territoryInfluence.upsert({
        where: {
          userId_territoryId_seasonId: { userId, territoryId: territory.id, seasonId: season.id },
        },
        update: { score: { increment: score } },
        create: { userId, territoryId: territory.id, seasonId: season.id, score },
      });
      const leader = await tx.territoryInfluence.findFirst({
        where: { territoryId: territory.id, seasonId: season.id },
        orderBy: [{ score: 'desc' }, { userId: 'asc' }],
      });
      if (leader && leader.userId !== previous?.userId) {
        await tx.territoryOwnershipHistory.create({
          data: {
            territoryId: territory.id,
            seasonId: season.id,
            previousUserId: previous?.userId,
            ownerUserId: leader.userId,
          },
        });
        await tx.notification.create({
          data: {
            userId: leader.userId,
            title: 'Territory captured',
            body: `You now lead ${territory.name}.`,
          },
        });
        if (previous)
          await tx.notification.create({
            data: {
              userId: previous.userId,
              title: 'Territory leadership changed',
              body: `${territory.name} has a new leader.`,
            },
          });
      }
    }
  const missions = await tx.userMission.findMany({
    where: { userId, completedAt: null },
    include: { mission: { include: { sponsor: true } } },
  });
  for (const entry of missions.sort(
    (a, b) => Number(a.mission.category === 'MISSIONS') - Number(b.mission.category === 'MISSIONS'),
  )) {
    const mission = entry.mission;
    if (
      mission.status !== 'PUBLISHED' ||
      mission.startsAt > new Date() ||
      mission.endsAt < new Date()
    )
      continue;
    if (
      mission.sponsor &&
      (mission.sponsor.status !== 'APPROVED' ||
        mission.sponsor.startsAt > new Date() ||
        mission.sponsor.endsAt <= new Date())
    )
      continue;
    const criteria = missionEligibilitySchema.parse(mission.eligibility);
    if (criteria.teamRequired && !user.teamId) continue;
    const localHour = (new Date(ride!.startedAt!).getUTCHours() + 5) % 24;
    if (
      criteria.hourStart !== null &&
      criteria.hourEnd !== null &&
      (localHour < criteria.hourStart || localHour >= criteria.hourEnd)
    )
      continue;
    if (
      criteria.district &&
      !touched.some((territory) => territory.district === criteria.district) &&
      station!.district !== criteria.district
    )
      continue;
    let increment =
      mission.category === 'DISTANCE'
        ? ride!.distanceM
        : mission.category === 'DURATION'
          ? ride!.durationSec
          : mission.category === 'INFLUENCE'
            ? influence
            : mission.category === 'ROUTE'
              ? Number(ride!.step === DEMO_ROUTE.length - 1)
              : mission.category === 'RIDES'
                ? 1
                : touched.length;
    if (mission.category === 'EXPLORATION') {
      increment = 0;
      for (const territory of touched) {
        const visited = await tx.missionExploration.findUnique({
          where: {
            userId_missionId_territoryId: {
              userId,
              missionId: mission.id,
              territoryId: territory.id,
            },
          },
        });
        if (!visited) {
          await tx.missionExploration.create({
            data: { userId, missionId: mission.id, territoryId: territory.id },
          });
          increment++;
        }
      }
    }
    if (mission.category === 'ACTIVE_DAYS' || mission.category === 'DISTRICTS') {
      increment = 0;
      const keys =
        mission.category === 'ACTIVE_DAYS'
          ? [new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10)]
          : [...new Set([station!.district, ...touched.map((territory) => territory.district)])];
      for (const key of keys) {
        const visited = await tx.missionVisit.findUnique({
          where: { userMissionId_key: { userMissionId: entry.id, key } },
        });
        if (!visited) {
          await tx.missionVisit.create({ data: { userMissionId: entry.id, key } });
          increment++;
        }
      }
    }
    if (mission.category === 'MISSIONS')
      increment = Math.max(
        0,
        (await tx.userMission.count({
          where: {
            userId,
            completedAt: {
              gte:
                entry.joinedAt && entry.joinedAt > mission.startsAt
                  ? entry.joinedAt
                  : mission.startsAt,
            },
            missionId: { not: mission.id },
          },
        })) - entry.progress,
      );
    const progress = Math.min(mission.target, entry.progress + increment);
    const complete = progress >= mission.target;
    await tx.userMission.update({
      where: { id: entry.id },
      data: { progress, completedAt: complete ? new Date() : null },
    });
    if (complete) {
      await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: mission.xp }, points: { increment: mission.points } },
      });
      await tx.notification.create({
        data: {
          userId,
          title: 'Mission completed',
          body: `${mission.name} · +${mission.xp} XP · +${mission.points} points`,
        },
      });
    }
  }
  const landmarks = await tx.landmark.findMany();
  for (const landmark of landmarks)
    if (
      points.some((p) => turf.distance(p, [landmark.lng, landmark.lat], { units: 'meters' }) < 250)
    )
      await tx.passportStamp.upsert({
        where: { userId_landmarkId: { userId, landmarkId: landmark.id } },
        create: { userId, landmarkId: landmark.id },
        update: {},
      });
  await evaluateProgression(tx, userId);
  await tx.notification.create({
    data: {
      userId,
      title: 'Your city, a little more yours.',
      body: `Ride complete · ${(ride!.distanceM / 1000).toFixed(1)} km · +${xp} XP. Demo wallet charged ${price.toLocaleString()} UZS.`,
    },
  });
  await scoreBattles(tx, id, userId, ride!.distanceM, influence);
  return { ...result, influence };
}
