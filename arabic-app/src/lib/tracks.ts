// ============================================================================
// Pure track-selection helpers (Phase 14 — multi-track).
//
// During onboarding the user picks an interest (stored device-side under
// 'onboarding:interest'). Once more than one track exists, that choice decides
// which track they start on. Kept pure + tested; the persistence lives in
// src/hooks/useSelectedTrack.ts.
// ============================================================================

// Track slugs must match supabase/seed.sql (and any imported content).
export const DEFAULT_TRACK_SLUG = 'communication-charisma';
export const CONFIDENCE_TRACK_SLUG = 'self-confidence';

// Pick a track's display name for the current UI language. Tracks carry an
// English name (title_en); when the app is in English and it exists, use it,
// otherwise fall back to the Arabic name. (Lessons are Arabic-only content, so
// this applies to track names only.)
export function trackTitle(
  track: { title_ar: string; title_en: string | null },
  language: string
): string {
  return language.startsWith('en') && track.title_en ? track.title_en : track.title_ar;
}

// Map an onboarding interest key (see app/(onboarding)/index.tsx) to the
// track the user most likely wants first. Unknown/missing interests fall back
// to the default track — never a broken empty state.
export function interestToTrackSlug(interest: string | null | undefined): string {
  switch (interest) {
    case 'interestConfidence':
      return CONFIDENCE_TRACK_SLUG;
    case 'interestCommunication':
    case 'interestLeadership': // no leadership track yet; communication is closest
    default:
      return DEFAULT_TRACK_SLUG;
  }
}
