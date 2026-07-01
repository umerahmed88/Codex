import { advanceStreak, isStreakActive, dayDiff, toDayString, type StreakState } from '../lib/streak';

describe('dayDiff', () => {
  it('counts whole calendar days', () => {
    expect(dayDiff('2026-07-01', '2026-07-02')).toBe(1);
    expect(dayDiff('2026-07-01', '2026-07-01')).toBe(0);
    expect(dayDiff('2026-07-01', '2026-07-08')).toBe(7);
  });

  it('is negative when the second date is earlier', () => {
    expect(dayDiff('2026-07-02', '2026-07-01')).toBe(-1);
  });

  it('handles month and year boundaries', () => {
    expect(dayDiff('2026-07-31', '2026-08-01')).toBe(1);
    expect(dayDiff('2026-12-31', '2027-01-01')).toBe(1);
    expect(dayDiff('2028-02-28', '2028-02-29')).toBe(1); // leap year
  });
});

describe('toDayString', () => {
  it('zero-pads month and day', () => {
    expect(toDayString(new Date(2026, 0, 5))).toBe('2026-01-05'); // Jan = month 0
  });
});

describe('advanceStreak', () => {
  const base: StreakState = { current_streak: 0, longest_streak: 0, last_active_date: null };

  it('first ever activity starts the streak at 1', () => {
    const next = advanceStreak(base, '2026-07-01');
    expect(next.current_streak).toBe(1);
    expect(next.longest_streak).toBe(1);
    expect(next.last_active_date).toBe('2026-07-01');
  });

  it('completing again the SAME day does not change the streak (idempotent)', () => {
    const state: StreakState = { current_streak: 3, longest_streak: 5, last_active_date: '2026-07-01' };
    const next = advanceStreak(state, '2026-07-01');
    expect(next).toEqual(state);
  });

  it('completing the NEXT day increments the streak', () => {
    const state: StreakState = { current_streak: 3, longest_streak: 5, last_active_date: '2026-07-01' };
    const next = advanceStreak(state, '2026-07-02');
    expect(next.current_streak).toBe(4);
    expect(next.longest_streak).toBe(5); // 4 < 5, unchanged
    expect(next.last_active_date).toBe('2026-07-02');
  });

  it('a new record updates longest_streak', () => {
    const state: StreakState = { current_streak: 5, longest_streak: 5, last_active_date: '2026-07-01' };
    const next = advanceStreak(state, '2026-07-02');
    expect(next.current_streak).toBe(6);
    expect(next.longest_streak).toBe(6);
  });

  it('missing exactly one day resets the streak to 1', () => {
    const state: StreakState = { current_streak: 9, longest_streak: 9, last_active_date: '2026-07-01' };
    const next = advanceStreak(state, '2026-07-03'); // skipped the 2nd
    expect(next.current_streak).toBe(1);
    expect(next.longest_streak).toBe(9); // preserved
    expect(next.last_active_date).toBe('2026-07-03');
  });

  it('missing many days resets to 1', () => {
    const state: StreakState = { current_streak: 20, longest_streak: 20, last_active_date: '2026-07-01' };
    const next = advanceStreak(state, '2026-07-15');
    expect(next.current_streak).toBe(1);
    expect(next.longest_streak).toBe(20);
  });

  it('a backwards clock (negative diff) resets safely to 1 without inflating', () => {
    const state: StreakState = { current_streak: 4, longest_streak: 4, last_active_date: '2026-07-05' };
    const next = advanceStreak(state, '2026-07-04');
    expect(next.current_streak).toBe(1);
    expect(next.last_active_date).toBe('2026-07-04');
  });

  it('increments correctly across a month boundary', () => {
    const state: StreakState = { current_streak: 2, longest_streak: 2, last_active_date: '2026-07-31' };
    const next = advanceStreak(state, '2026-08-01');
    expect(next.current_streak).toBe(3);
  });
});

describe('isStreakActive', () => {
  it('is active if last active was today or yesterday', () => {
    expect(isStreakActive({ current_streak: 1, longest_streak: 1, last_active_date: '2026-07-02' }, '2026-07-02')).toBe(true);
    expect(isStreakActive({ current_streak: 1, longest_streak: 1, last_active_date: '2026-07-01' }, '2026-07-02')).toBe(true);
  });

  it('is broken if a full day was missed', () => {
    expect(isStreakActive({ current_streak: 1, longest_streak: 1, last_active_date: '2026-07-01' }, '2026-07-03')).toBe(false);
  });

  it('is inactive with no history', () => {
    expect(isStreakActive({ current_streak: 0, longest_streak: 0, last_active_date: null }, '2026-07-02')).toBe(false);
  });
});
