// ============================================================================
// XP and level math — pure functions, so the curve is easy to tune and test.
// (The level UI/progress bar lands in Phase 4; the awarding happens in Phase 3
// when a lesson is completed.)
// ============================================================================

// XP granted for completing one lesson. Kept as a named constant so the value
// is defined in exactly one place.
export const XP_PER_LESSON = 10;

// A gentle level curve: each level needs a bit more XP than the last.
// Level 1 starts at 0 XP; the threshold for level N is 50 * (N-1) * N / 2 ...
// but we keep it simple and legible: level N requires 50*(N-1) cumulative XP.
export function levelForXp(totalXp: number): number {
  if (totalXp < 0) return 1;
  return Math.floor(totalXp / 50) + 1;
}

// XP thresholds bracketing the current level, for a progress bar.
export function levelProgress(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number; // 0..1 toward next level
} {
  const level = levelForXp(totalXp);
  const currentLevelXp = (level - 1) * 50;
  const nextLevelXp = level * 50;
  const span = nextLevelXp - currentLevelXp;
  const into = totalXp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: span > 0 ? into / span : 0,
  };
}
