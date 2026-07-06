// ============================================================================
// Lightweight product analytics / monitoring.
//
// One typed funnel for the handful of launch events we actually care about
// (activation, paywall, coach, retention). Every event is dual-written:
//   1. Sentry breadcrumb — a crash report carries the trail of what the user
//      did just before it (monitoring signal).
//   2. PostHog event (Phase 15) — funnels/retention dashboards. Silent no-op
//      until EXPO_PUBLIC_POSTHOG_KEY is set (see src/lib/posthog.ts).
// The closed event union stays the single source of truth for both sinks.
// ============================================================================
import { Sentry } from './sentry';
import { getPostHog } from './posthog';

// The closed set of events we track. Keeping this a union (not free-form
// strings) means dashboards never drown in typo'd one-off event names.
export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_completed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'streak_milestone'
  | 'coach_question_asked'
  | 'paywall_viewed'
  | 'subscription_started'
  | 'feedback_submitted';

export type AnalyticsProps = Record<string, string | number | boolean>;

// Build the normalized breadcrumb payload for an event. Pure — no I/O — so a
// test can assert we categorize/shape events consistently.
export function buildBreadcrumb(event: AnalyticsEvent, props?: AnalyticsProps) {
  return {
    category: 'analytics',
    // Sentry shows this as the breadcrumb title in the crash timeline.
    message: event,
    level: 'info' as const,
    data: props ?? {},
  };
}

// Record a product event. Fire-and-forget: analytics must never throw into or
// slow down a user flow, so any failure is swallowed (and reported to Sentry).
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    Sentry.addBreadcrumb(buildBreadcrumb(event, props));
  } catch (err) {
    // Analytics failing is not worth crashing a screen over.
    Sentry.captureException(err);
  }
  try {
    getPostHog()?.capture(event, props);
  } catch (err) {
    Sentry.captureException(err);
  }
}
