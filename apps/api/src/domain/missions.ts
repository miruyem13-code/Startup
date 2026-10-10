import type { Transaction } from '../db';
import { missionEligibilitySchema, missionSchema } from '../../../../packages/shared/schemas';
import type { z } from 'zod/v4';
import { requireThat } from '../security';

export function eligibleForMission(
  eligibility: unknown,
  user: { xp: number; teamId: string | null },
) {
  const rules = missionEligibilitySchema.parse(eligibility);
  return (
    user.xp >= rules.minXp &&
    (rules.maxXp === null || user.xp <= rules.maxXp) &&
    (!rules.teamRequired || !!user.teamId)
  );
}
export async function validatedMission(
  tx: Transaction,
  data: z.infer<typeof missionSchema>,
  fallbackStart = new Date(),
) {
  const startsAt = data.startsAt ? new Date(data.startsAt) : fallbackStart;
  const endsAt = new Date(data.endsAt);
  requireThat(endsAt > startsAt && endsAt > new Date(), 422, 'Choose a valid mission window.');
  const rules = data.eligibility;
  requireThat(
    rules.maxXp === null || rules.maxXp >= rules.minXp,
    422,
    'Maximum XP must not be below minimum XP.',
  );
  requireThat(
    (rules.hourStart === null && rules.hourEnd === null) ||
      (rules.hourStart !== null && rules.hourEnd !== null && rules.hourEnd > rules.hourStart),
    422,
    'Choose a complete time window within one Tashkent day.',
  );
  if (data.sponsorId) {
    const sponsor = await tx.sponsor.findUnique({ where: { id: data.sponsorId } });
    requireThat(
      sponsor &&
        sponsor.status === 'APPROVED' &&
        sponsor.startsAt <= startsAt &&
        sponsor.endsAt >= endsAt,
      422,
      'Choose an approved sponsor covering the complete mission window.',
    );
  }
  return { ...data, startsAt, endsAt, sponsored: !!data.sponsorId };
}
