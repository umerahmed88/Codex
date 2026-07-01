// ============================================================================
// The streak state machine — deliberately pure and side-effect-free.
//
// This is the single most bug-prone piece of the app (off-by-one date errors
// are notorious), so ALL date logic lives here, isolated and exhaustively
// tested. Screens and hooks call these functions; they never do date math
// themselves.
//
// Dates are handled as calendar days in the user's local time, compared as
// "YYYY-MM-DD" strings to sidestep timezone/DST hour arithmetic entirely.
// ============================================================================

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null; // 'YYYY-MM-DD'
}

// Normalize any Date to a local 'YYYY-MM-DD' string.
export function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Difference in whole calendar days between two 'YYYY-MM-DD' strings
// (b - a). Positive means b is later. Uses UTC-midnight of each day so the
// subtraction is exact and DST-proof.
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((bMs - aMs) / 86_400_000);
}

// Given the current streak state and "today", return the NEW state after the
// user completes a lesson today. Three cases the plan calls out:
//   - already active today  → no change (idempotent; completing a 2nd lesson
//                             the same day must not inflate the streak)
//   - last active yesterday → increment
//   - missed one or more days (or first ever) → reset to 1
export function advanceStreak(state: StreakState, today: string): StreakState {
  const last = state.last_active_date;

  // First activity ever, or somehow a future last_active (clock skew) → start at 1.
  if (!last) {
    return {
      current_streak: 1,
      longest_streak: Math.max(state.longest_streak, 1),
      last_active_date: today,
    };
  }

  const diff = dayDiff(last, today);

  if (diff === 0) {
    // Same day — idempotent no-op.
    return state;
  }

  if (diff === 1) {
    // Consecutive day — increment.
    const current = state.current_streak + 1;
    return {
      current_streak: current,
      longest_streak: Math.max(state.longest_streak, current),
      last_active_date: today,
    };
  }

  // diff >= 2 (missed a day) or diff < 0 (clock went backwards) → reset to 1.
  return {
    current_streak: 1,
    longest_streak: Math.max(state.longest_streak, 1),
    last_active_date: today,
  };
}

// A read-time helper: is the stored streak still "alive" as of today, or has
// the user let it lapse (missed a full day)? Used to show a broken-streak UI
// without writing to the DB.
export function isStreakActive(state: StreakState, today: string): boolean {
  if (!state.last_active_date) return false;
  const diff = dayDiff(state.last_active_date, today);
  return diff === 0 || diff === 1;
}
