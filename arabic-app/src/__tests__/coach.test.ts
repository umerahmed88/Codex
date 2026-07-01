import { canAskCoach, remainingQuestions, FREE_DAILY_LIMIT } from '../lib/coach';

describe('canAskCoach', () => {
  it('lets free users ask until the daily limit', () => {
    expect(canAskCoach(0, false)).toBe(true);
    expect(canAskCoach(FREE_DAILY_LIMIT - 1, false)).toBe(true);
    expect(canAskCoach(FREE_DAILY_LIMIT, false)).toBe(false);
    expect(canAskCoach(FREE_DAILY_LIMIT + 5, false)).toBe(false);
  });

  it('never limits paid users', () => {
    expect(canAskCoach(0, true)).toBe(true);
    expect(canAskCoach(9999, true)).toBe(true);
  });
});

describe('remainingQuestions', () => {
  it('counts down for free users and floors at zero', () => {
    expect(remainingQuestions(0, false)).toBe(FREE_DAILY_LIMIT);
    expect(remainingQuestions(1, false)).toBe(FREE_DAILY_LIMIT - 1);
    expect(remainingQuestions(FREE_DAILY_LIMIT, false)).toBe(0);
    expect(remainingQuestions(FREE_DAILY_LIMIT + 3, false)).toBe(0);
  });

  it('is Infinity for paid users', () => {
    expect(remainingQuestions(100, true)).toBe(Infinity);
  });
});
