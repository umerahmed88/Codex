import {
  milestoneForStreak,
  milestoneForCompletion,
  nextMilestone,
  MILESTONES,
} from '../lib/milestones';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

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

describe('milestoneForCompletion', () => {
  it('fires when the streak advances to a threshold', () => {
    expect(milestoneForCompletion(2, 3, false)?.days).toBe(3);
    expect(milestoneForCompletion(6, 7, false)?.days).toBe(7);
  });

  it('does NOT re-fire on a same-day repeat (streak unchanged)', () => {
    // Second lesson on the day the streak hit 7: newStreak === prevStreak.
    expect(milestoneForCompletion(7, 7, false)).toBeNull();
  });

  it('does NOT fire when the lesson was already completed', () => {
    expect(milestoneForCompletion(6, 7, true)).toBeNull();
  });

  it('does not fire when advancing to a non-threshold day', () => {
    expect(milestoneForCompletion(3, 4, false)).toBeNull();
  });

  it('handles a reset streak (missed days → back to 1)', () => {
    expect(milestoneForCompletion(9, 1, false)).toBeNull();
  });
});

describe('milestone titleKeys resolve in both locales', () => {
  const resolve = (obj: Record<string, unknown>, path: string): unknown =>
    path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);

  it.each(MILESTONES)('$titleKey exists in ar + en', ({ titleKey }) => {
    expect(typeof resolve(ar, titleKey)).toBe('string');
    expect(typeof resolve(en, titleKey)).toBe('string');
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
