// ============================================================================
// Design tokens — "Lumi" identity: bright, playful, high-energy, drawn from the
// mascot (teal skin, cream belly, purple scarf, gold star, coral spark).
// Every colour is WCAG-AA verified for its real usage (see contrast.test.ts).
// Existing keys are preserved so screens adopt the new look automatically.
// ============================================================================
export const colors = {
  // Primary — Lumi teal (buttons, brand). Deep enough for white text @ AA.
  primary: '#0A8571',
  primaryLight: '#0A7E6C', // links & small buttons (legible on white AND white-on-it)
  primaryDark: '#073F37', // pressed/depth + dark text on gold

  // Accent — star gold (XP, rewards, highlights)
  accent: '#F6B02E',
  accentLight: '#FFCE6B',

  // Secondary — scarf purple (second track, secondary CTAs)
  secondary: '#8A5CD1',
  secondaryDark: '#5E3AA0',
  secondaryLight: '#A98AE0',

  // Neutrals — warm cream world
  background: '#F4EAD0',
  surface: '#FFFFFF',
  surfaceAlt: '#EFE3C6',
  border: '#E4D6B2',

  // Text — deep night-navy on cream
  textPrimary: '#17233F',
  textSecondary: '#45527E',
  textMuted: '#5F6488',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#2E8B57',
  warning: '#8F5D00', // AA on the cream background + as the offline-banner bg
  error: '#C0392B',
  info: '#2E5F8F',

  // Gamification
  streak: '#E8632A', // fire orange
  xp: '#F6B02E', // gold

  // Lumi palette extras (used by the redesigned screens/components)
  mint: '#74E3C6',
  coral: '#F26B6B',
  gold: '#F6B02E',
  navy: '#1B2A54',

  // Per-track category accents (path nodes, track pills)
  categoryTeal: '#0A8571',
  categoryPurple: '#8A5CD1',
  categoryCoral: '#E8632A',
  categoryGold: '#F6B02E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  // Arabic font family — loaded via expo-font
  fontFamily: {
    arabic: 'Cairo',
    arabicBold: 'Cairo-Bold',
    arabicSemiBold: 'Cairo-SemiBold',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    display: 40,
    hero: 52, // big celebratory numbers/headers
  },
  lineHeight: {
    tight: 1.3,
    normal: 1.6, // generous for Arabic readability
    relaxed: 1.8,
  },
} as const;

// Chunkier, more playful radii (Duolingo-style rounded cards + pills).
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

// Playful "solid" depth: a soft drop shadow. Chunky 3D button depth is done
// per-component with a solid bottom border/offset, not here.
export const shadows = {
  sm: {
    shadowColor: '#3A2A10',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#3A2A10',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  lg: {
    shadowColor: '#3A2A10',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 9,
  },
} as const;
