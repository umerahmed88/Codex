// ============================================================================
// Milestones — tasteful streak achievements (NOT casino-like).
//
// Pure logic: given the streak count, decide whether a milestone was just hit.
// A milestone fires ONLY on the exact day the streak reaches the threshold, so
// we don't re-celebrate every subsequent day.
// ============================================================================

export interface Milestone {
  days: number;
  // i18n key (resolved with t() at display time) so the title follows the
  // app language instead of being hardcoded Arabic.
  titleKey: string;
  emoji: string;
}

// Ordered thresholds. Extend this list to add more — the logic below adapts.
export const MILESTONES: Milestone[] = [
  { days: 3, titleKey: 'gamify.milestones.d3', emoji: '🌱' },
  { days: 7, titleKey: 'gamify.milestones.d7', emoji: '🔥' },
  { days: 14, titleKey: 'gamify.milestones.d14', emoji: '⭐' },
  { days: 30, titleKey: 'gamify.milestones.d30', emoji: '🏆' },
];

// Returns the milestone reached at EXACTLY this streak count, or null.
export function milestoneForStreak(currentStreak: number): Milestone | null {
  return MILESTONES.find((m) => m.days === currentStreak) ?? null;
}

// Decide whether a lesson completion should celebrate a milestone. It must fire
// ONLY when this completion actually advanced the streak to a threshold — never
// on a same-day repeat (server no-op, newStreak === prevStreak) or when the
// lesson was already completed. This is what prevents the milestone fanfare from
// replaying when a user does a second lesson on the day they hit the streak.
export function milestoneForCompletion(
  prevStreak: number,
  newStreak: number,
  alreadyCompleted: boolean
): Milestone | null {
  if (alreadyCompleted) return null;
  if (newStreak <= prevStreak) return null;
  return milestoneForStreak(newStreak);
}

// The next milestone the user is working toward (for a "2 days to go" hint),
// or null if they've passed the last one.
export function nextMilestone(currentStreak: number): Milestone | null {
  return MILESTONES.find((m) => m.days > currentStreak) ?? null;
}
