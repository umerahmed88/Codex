// ============================================================================
// PostHog product analytics (Phase 15).
//
// Configured entirely by env: set EXPO_PUBLIC_POSTHOG_KEY (and optionally
// EXPO_PUBLIC_POSTHOG_HOST) and events flow; leave it unset and every function
// here is a silent no-op — the established graceful-fallback pattern, so the
// app never depends on an analytics vendor to work.
//
// PDPL/privacy note: we identify users by their opaque Supabase user id only —
// no email, no name, no device contacts. See docs/phase-15-growth.md.
// ============================================================================
import PostHog from 'posthog-react-native';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
// EU cloud by default — closer to the target market and simpler PDPL story.
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let client: PostHog | null = null;

// Lazy singleton: created on first use, only when a key is configured.
export function getPostHog(): PostHog | null {
  if (!KEY) return null;
  if (!client) {
    client = new PostHog(KEY, { host: HOST });
  }
  return client;
}

// Tie events to the (opaque) user id after login.
export function identifyUser(userId: string): void {
  try {
    getPostHog()?.identify(userId);
  } catch {
    // Analytics must never break auth.
  }
}

// Detach the id on logout so the next user on this device isn't mislabeled.
export function resetUser(): void {
  try {
    getPostHog()?.reset();
  } catch {
    // Same: never let analytics failures surface.
  }
}
