import {
  canAskCoach,
  remainingQuestions,
  isQuestionValid,
  isRateLimitedPerMinute,
  FREE_DAILY_LIMIT,
  MAX_QUESTION_LENGTH,
  PER_MINUTE_LIMIT,
  toChatHistory,
  HISTORY_TURNS,
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

describe('toChatHistory', () => {
  const ex = (q: string, a: string | null) => ({ question: q, answer: a });

  it('produces alternating user/assistant messages, oldest first', () => {
    // Stored newest-first (as queried with order created_at desc)
    const msgs = toChatHistory([ex('q2', 'a2'), ex('q1', 'a1')]);
    expect(msgs).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
      { role: 'assistant', content: 'a2' },
    ]);
  });

  it('skips unanswered exchanges', () => {
    const msgs = toChatHistory([ex('pending', null), ex('q1', 'a1')]);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe('q1');
  });

  it('caps at HISTORY_TURNS exchanges (keeping the most recent)', () => {
    const many = Array.from({ length: HISTORY_TURNS + 4 }, (_, i) =>
      ex(`q${i}`, `a${i}`)
    ); // index 0 = newest
    const msgs = toChatHistory(many);
    expect(msgs).toHaveLength(HISTORY_TURNS * 2);
    // Oldest kept exchange is index HISTORY_TURNS-1; newest (q0) must be last.
    expect(msgs[msgs.length - 2].content).toBe('q0');
  });

  it('returns empty for no history', () => {
    expect(toChatHistory([])).toEqual([]);
  });
});
