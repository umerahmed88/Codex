import { milestoneForStreak, nextMilestone, MILESTONES } from '../lib/milestones';

describe('milestoneForStreak', () => {
  it('fires exactly on a threshold day', () => {
    expect(milestoneForStreak(3)?.days).toBe(3);
    expect(milestoneForStreak(7)?.days).toBe(7);
    expect(milestoneForStreak(30)?.days).toBe(30);
  });

  it('does not fire on non-threshold days', () => {
    expect(milestoneForStreak(1)).toBeNull();
    expect(milestoneForStreak(4)).toBeNull();
    expect(milestoneForStreak(8)).toBeNull();
    expect(milestoneForStreak(0)).toBeNull();
  });
});

describe('nextMilestone', () => {
  it('points to the next unreached milestone', () => {
    expect(nextMilestone(0)?.days).toBe(3);
    expect(nextMilestone(3)?.days).toBe(7);
    expect(nextMilestone(10)?.days).toBe(14);
  });

  it('returns null once past the final milestone', () => {
    const last = MILESTONES[MILESTONES.length - 1].days;
    expect(nextMilestone(last)).toBeNull();
    expect(nextMilestone(last + 5)).toBeNull();
  });
});
