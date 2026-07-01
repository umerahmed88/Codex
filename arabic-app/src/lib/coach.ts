// ============================================================================
// Pure helpers + types for the AI Coach.
// The rate-limit math is duplicated from the Edge Function intentionally: the
// server enforces it (authoritative), while the client uses the same numbers to
// show "N questions left today" without a round-trip. Keeping it pure means we
// can unit-test the boundary conditions here.
// ============================================================================

export const FREE_DAILY_LIMIT = 3;

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
