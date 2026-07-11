// ============================================================================
// WCAG contrast regression guard (Phase 16 a11y audit).
// Locks in the fixed contrast ratios so a future palette tweak can't silently
// drop a real text/background pairing below AA.
// ============================================================================
import { colors } from '../theme';

// Relative luminance + contrast ratio per WCAG 2.1.
function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0; // ≥18.66pt bold or ≥24pt normal

describe('WCAG contrast — normal text pairs must clear AA (4.5:1)', () => {
  const pairs: [string, string, string][] = [
    ['textPrimary on background', colors.textPrimary, colors.background],
    ['textPrimary on surface', colors.textPrimary, colors.surface],
    ['textSecondary on background', colors.textSecondary, colors.background],
    ['textSecondary on surface', colors.textSecondary, colors.surface],
    ['textMuted on background', colors.textMuted, colors.background],
    ['textMuted on surface', colors.textMuted, colors.surface],
    ['textInverse on primary (buttons)', colors.textInverse, colors.primary],
    ['textInverse on primaryLight (buttons)', colors.textInverse, colors.primaryLight],
    ['textInverse on secondary (purple buttons)', colors.textInverse, colors.secondary],
    ['textInverse on secondaryDark', colors.textInverse, colors.secondaryDark],
    ['primaryLight on surface (links)', colors.primaryLight, colors.surface],
    ['primary on surface (active tab / links)', colors.primary, colors.surface],
    ['primaryDark on accent (upgrade button)', colors.primaryDark, colors.accent],
    ['navy on accent', colors.navy, colors.accent],
    ['warning as text on surface', colors.warning, colors.surface],
    ['warning as text on background', colors.warning, colors.background],
    ['textInverse on warning (offline banner)', colors.textInverse, colors.warning],
    ['error on surface', colors.error, colors.surface],
  ];

  it.each(pairs)('%s', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('WCAG contrast — large-text-only pairs must clear AA-large (3:1)', () => {
  // These render only at large sizes (streak count is 20pt+ bold; celebration
  // headings), so 3:1 is the applicable threshold.
  const largePairs: [string, string, string][] = [
    ['streak count on surface', colors.streak, colors.surface],
    ['success on surface', colors.success, colors.surface],
  ];

  it.each(largePairs)('%s', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
