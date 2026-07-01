// ============================================================================
// Milestones — tasteful streak achievements (NOT casino-like).
//
// Pure logic: given the streak count, decide whether a milestone was just hit.
// A milestone fires ONLY on the exact day the streak reaches the threshold, so
// we don't re-celebrate every subsequent day.
// ============================================================================

export interface Milestone {
  days: number;
  title_ar: string;
  emoji: string;
}

// Ordered thresholds. Extend this list to add more — the logic below adapts.
export const MILESTONES: Milestone[] = [
  { days: 3, title_ar: 'ثلاثة أيام متتالية!', emoji: '🌱' },
  { days: 7, title_ar: 'أسبوع كامل! أحسنت', emoji: '🔥' },
  { days: 14, title_ar: 'أسبوعان من الاستمرار', emoji: '⭐' },
  { days: 30, title_ar: 'شهر كامل! إنجاز رائع', emoji: '🏆' },
];

// Returns the milestone reached at EXACTLY this streak count, or null.
export function milestoneForStreak(currentStreak: number): Milestone | null {
  return MILESTONES.find((m) => m.days === currentStreak) ?? null;
}

// The next milestone the user is working toward (for a "2 days to go" hint),
// or null if they've passed the last one.
export function nextMilestone(currentStreak: number): Milestone | null {
  return MILESTONES.find((m) => m.days > currentStreak) ?? null;
}
