// ============================================================================
// Pure helpers + types for the AI Coach.
// The rate-limit math is duplicated from the Edge Function intentionally: the
// server enforces it (authoritative), while the client uses the same numbers to
// show "N questions left today" without a round-trip. Keeping it pure means we
// can unit-test the boundary conditions here.
// ============================================================================

export const FREE_DAILY_LIMIT = 3;

// Abuse hardening (Phase 11) — enforced server-side in the coach Edge
// Function and mirrored client-side for instant feedback.
export const MAX_QUESTION_LENGTH = 500; // chars; bounds per-request LLM cost
export const PER_MINUTE_LIMIT = 3; // applies to paid users too (burst guard)

// Is this question sendable at all? (Length/emptiness — not rate limits.)
export function isQuestionValid(question: string): boolean {
  const trimmed = question.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_QUESTION_LENGTH;
}

// Burst guard: has the user hit the per-minute ceiling?
export function isRateLimitedPerMinute(questionsInLastMinute: number): boolean {
  return questionsInLastMinute >= PER_MINUTE_LIMIT;
}

export interface Citation {
  lesson_id: string;
  title: string;
}

export interface CoachAnswer {
  answer: string;
  citation: Citation | null;
}

// A single message in the on-screen conversation.
export interface CoachTurn {
  role: 'user' | 'coach';
  text: string;
  citation?: Citation | null;
}

// Can this user ask another question right now?
export function canAskCoach(questionsAskedToday: number, isPaid: boolean): boolean {
  if (isPaid) return true;
  return questionsAskedToday < FREE_DAILY_LIMIT;
}

// How many free questions remain today (Infinity for paid users).
export function remainingQuestions(questionsAskedToday: number, isPaid: boolean): number {
  if (isPaid) return Infinity;
  return Math.max(0, FREE_DAILY_LIMIT - questionsAskedToday);
}

// Conversation memory (Phase 13): how many prior Q&A exchanges the coach sees.
export const HISTORY_TURNS = 6;

export interface CoachExchange {
  question: string;
  answer: string | null;
}

// Turn stored exchanges (newest-first, as queried) into the alternating
// user/assistant message list the LLM expects (oldest-first), skipping any
// unanswered rows and capping at HISTORY_TURNS exchanges. Pure — mirrored in
// the coach Edge Function; tested here.
export function toChatHistory(
  exchanges: CoachExchange[],
  maxTurns: number = HISTORY_TURNS
): { role: 'user' | 'assistant'; content: string }[] {
  return exchanges
    .filter((e) => e.answer !== null && e.answer !== '')
    .slice(0, maxTurns)
    .reverse()
    .flatMap((e) => [
      { role: 'user' as const, content: e.question },
      { role: 'assistant' as const, content: e.answer as string },
    ]);
}
