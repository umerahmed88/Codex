// Design tokens — calm, trustworthy palette for a self-improvement brand
export const colors = {
  // Primary — deep navy (trust, depth)
  primary: '#1A3A5C',
  primaryLight: '#2E5F8F',
  primaryDark: '#0F2338',

  // Accent — warm gold (achievement, reward)
  accent: '#C9A84C',
  accentLight: '#E8C96A',

  // Neutrals
  background: '#F7F4EF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEE9E0',
  border: '#D9D1C4',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#5A5A7A',
  // Darkened for WCAG AA (Phase 16 a11y audit): the old #9A9AB0 was ~2.5:1 on
  // our light backgrounds; #696985 clears 4.5:1 on background and surface.
  textMuted: '#696985',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#2E8B57',
  // Darkened for WCAG AA (Phase 16): #E8A020 failed both as text on light
  // surfaces (2.2:1) AND as the OfflineBanner background under white text
  // (2.2:1). #9A6400 clears 4.5:1 in every one of those usages.
  warning: '#9A6400',
  error: '#C0392B',
  info: '#2E5F8F',

  // Gamification
  streak: '#E85C0D',
  xp: '#C9A84C',
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
  },
  lineHeight: {
    tight: 1.3,
    normal: 1.6,  // generous for Arabic readability
    relaxed: 1.8,
  },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
