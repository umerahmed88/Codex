// ============================================================================
// Feature flags, kill-switches & staged rollout — pure evaluation logic.
//
// These are the launch-ops levers we can pull WITHOUT shipping a new build:
//   • kill-switches   — turn a risky feature (Coach, paywall) off instantly.
//   • staged rollout   — release a feature to N% of users, ramp up over days.
//   • force-update      — block builds below a minimum version after a bad ship.
//
// Kept pure (no I/O) so the rollout maths and the "is this user in the bucket"
// decision are covered by tests, not discovered in production. The values
// themselves come from the `app_config` table (see useAppConfig).
// ============================================================================

// The flags the app knows about. Adding one here is the only place you edit
// to introduce a new kill-switch — the compiler then forces you to handle it.
export type FeatureFlagKey = 'coach' | 'paywall' | 'notifications' | 'feedback';

// A single flag's remote configuration. `enabled` is the hard on/off
// (kill-switch); `rolloutPercentage` gates a gradual release when enabled.
export interface FeatureFlag {
  enabled: boolean;
  // 0–100. 100 = everyone, 0 = nobody, 25 = a quarter of users (stable per
  // user). Omitted / out-of-range values are treated as 100 (fully enabled).
  rolloutPercentage?: number;
}

// The whole remote config blob the app fetches on launch.
export interface AppConfig {
  flags: Partial<Record<FeatureFlagKey, FeatureFlag>>;
  // Force-update kill-switch: builds older than this are blocked with an
  // "update required" screen. Empty string = no minimum (never blocks).
  minSupportedVersion: string;
}

// The safe defaults used before remote config loads, or if the fetch fails.
// Everything the launch depends on is ON by default so a config-fetch outage
// never dark-launches the whole app; kill-switches only ever turn things OFF.
export const DEFAULT_CONFIG: AppConfig = {
  flags: {
    coach: { enabled: true },
    paywall: { enabled: true },
    notifications: { enabled: true },
    feedback: { enabled: true },
  },
  minSupportedVersion: '',
};

// Deterministic 0–99 bucket for a (flag, user) pair. Same inputs always give
// the same bucket, so a user doesn't flip in and out of a staged rollout on
// every launch — and different flags bucket a user independently.
// FNV-1a string hash: tiny, dependency-free, good enough for even spreading.
export function rolloutBucket(flagKey: string, userId: string): number {
  const input = `${flagKey}:${userId}`;
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime multiply, kept in 32-bit range via Math.imul.
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 coerces to an unsigned 32-bit int before the modulo.
  return (hash >>> 0) % 100;
}

// Is this flag on for this user? Combines the kill-switch and staged rollout:
//   1. `enabled: false` → always off (kill-switch wins over everything).
//   2. rollout 100 (or unset/invalid) → on for everyone.
//   3. otherwise → on only if the user's stable bucket is under the percentage.
// `userId` may be undefined (signed-out); such users only see 0%/100% flags,
// never a partial rollout, so they get a consistent pre-login experience.
export function isFeatureEnabled(
  config: AppConfig,
  key: FeatureFlagKey,
  userId: string | undefined
): boolean {
  const flag = config.flags[key] ?? DEFAULT_CONFIG.flags[key];
  if (!flag || !flag.enabled) return false;

  const pct = flag.rolloutPercentage;
  if (pct === undefined || pct >= 100) return true;
  if (pct <= 0) return false;
  if (!userId) return false; // can't bucket an anonymous user into a partial roll

  return rolloutBucket(key, userId) < pct;
}

// Compare two dotted version strings ("1.2.0"). Returns -1 / 0 / 1 like a
// classic comparator. Missing segments count as 0, so "1.2" === "1.2.0".
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

// Force-update kill-switch: must the user update before they can use the app?
// True only when a minimum is configured AND the running build is below it.
export function isUpdateRequired(currentVersion: string, minSupportedVersion: string): boolean {
  if (!minSupportedVersion) return false;
  return compareVersions(currentVersion, minSupportedVersion) < 0;
}
