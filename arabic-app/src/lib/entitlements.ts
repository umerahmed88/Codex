// ============================================================================
// Pure entitlement / gating logic.
// "Which lessons are free vs premium, and can this user open this one?" — kept
// pure so the paywall boundary is verified by tests, not discovered in prod.
// ============================================================================
import type { LessonWithProgress } from '../types/database';

// The first lesson is free (no card required) — everything after needs a
// subscription. Tune this one constant to change the free-tier size.
export const FREE_LESSON_LIMIT = 1;

// The RevenueCat entitlement identifier that unlocks premium content.
export const PREMIUM_ENTITLEMENT = 'premium';

// Is this lesson behind the paywall (by its position in the track)?
export function isLessonPremium(dayNumber: number): boolean {
  return dayNumber > FREE_LESSON_LIMIT;
}

// Can the user open this lesson right now? Two gates must both pass:
//   1. Paywall gate: the lesson is free, OR the user is subscribed.
//   2. Progress gate: the lesson is unlocked in their track (not 'locked').
export function canAccessLesson(lesson: LessonWithProgress, isSubscribed: boolean): boolean {
  const paywallOk = !isLessonPremium(lesson.day_number) || isSubscribed;
  const progressOk = lesson.status !== 'locked';
  return paywallOk && progressOk;
}

// Should tapping this lesson open the paywall (rather than the lesson)?
// True only when the paywall is the thing blocking access.
export function shouldShowPaywall(lesson: LessonWithProgress, isSubscribed: boolean): boolean {
  return isLessonPremium(lesson.day_number) && !isSubscribed && lesson.status !== 'locked';
}
