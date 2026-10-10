import { describe, it, expect } from 'vitest';
import { weeklyConsistency, weekKey } from '../apps/api/src/domain/progression';

describe('healthy weekly consistency', () => {
  it('preserves activity across recovery weeks without awarding fictional active weeks', () => {
    const rides = ['2026-09-21', '2026-09-28'].map((day) => ({
      endedAt: new Date(`${day}T08:00:00Z`),
      distanceM: 5000,
    }));
    const stats = weeklyConsistency(rides, 5, new Date('2026-10-14T08:00:00Z'), [
      '2026-10-05',
      '2026-10-12',
    ]);
    expect(stats.activity).toEqual({ current: 2, best: 2 });
    expect(stats.goal).toEqual({ current: 2, best: 2 });
    expect(stats.recoveryThisWeek).toBe(true);
    expect(stats.weekKm).toBe(0);
  });
  it('uses Tashkent Monday boundaries and permits rest during an unfinished week', () => {
    expect(weekKey(new Date('2026-10-04T18:59:00Z'))).toBe('2026-09-28');
    expect(weekKey(new Date('2026-10-04T19:00:00Z'))).toBe('2026-10-05');
    const rides = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'].map((day) => ({
      endedAt: new Date(`${day}T08:00:00Z`),
      distanceM: 5000,
    }));
    const stats = weeklyConsistency(rides, 5, new Date('2026-10-07T08:00:00Z'));
    expect(stats.activity).toEqual({ current: 4, best: 4 });
    expect(stats.goal).toEqual({ current: 4, best: 4 });
    expect(stats.weekKm).toBe(0);
    expect(weeklyConsistency(rides, 10, new Date('2026-10-07T08:00:00Z')).goal.current).toBe(0);
    expect(weeklyConsistency(rides, 5, new Date('2026-10-14T08:00:00Z')).activity).toEqual({
      current: 0,
      best: 4,
    });
  });
  it('does not count future rides and accumulates distance across a week', () => {
    const stats = weeklyConsistency(
      [
        { endedAt: new Date('2026-10-05T08:00:00Z'), distanceM: 3000 },
        { endedAt: new Date('2026-10-06T08:00:00Z'), distanceM: 2000 },
        { endedAt: new Date('2026-10-12T08:00:00Z'), distanceM: 100000 },
      ],
      5,
      new Date('2026-10-07T08:00:00Z'),
    );
    expect(stats.goal).toEqual({ current: 1, best: 1 });
    expect(stats.weekKm).toBe(5);
  });
});
