import {
  canAskCoach,
  remainingQuestions,
  isQuestionValid,
  isRateLimitedPerMinute,
  FREE_DAILY_LIMIT,
  MAX_QUESTION_LENGTH,
  PER_MINUTE_LIMIT,
} from '../lib/coach';

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

describe('isQuestionValid', () => {
  it('rejects empty and whitespace-only questions', () => {
    expect(isQuestionValid('')).toBe(false);
    expect(isQuestionValid('   ')).toBe(false);
  });

  it('accepts questions up to the length cap (after trimming)', () => {
    expect(isQuestionValid('كيف أبدأ محادثة؟')).toBe(true);
    expect(isQuestionValid('س'.repeat(MAX_QUESTION_LENGTH))).toBe(true);
    expect(isQuestionValid('  ' + 'س'.repeat(MAX_QUESTION_LENGTH) + '  ')).toBe(true);
  });

  it('rejects questions over the length cap', () => {
    expect(isQuestionValid('س'.repeat(MAX_QUESTION_LENGTH + 1))).toBe(false);
  });
});

describe('isRateLimitedPerMinute', () => {
  it('allows bursts below the per-minute ceiling', () => {
    expect(isRateLimitedPerMinute(0)).toBe(false);
    expect(isRateLimitedPerMinute(PER_MINUTE_LIMIT - 1)).toBe(false);
  });

  it('blocks at and above the ceiling', () => {
    expect(isRateLimitedPerMinute(PER_MINUTE_LIMIT)).toBe(true);
    expect(isRateLimitedPerMinute(PER_MINUTE_LIMIT + 5)).toBe(true);
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
