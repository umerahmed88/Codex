# Phase 10 — Launch ops: kill-switches, staged rollout, monitoring & feedback

The launch-day control panel. Everything here lets you steer a live release
**without shipping a new build** — plus the in-app feedback line and the
monitoring trail. The code is in place; this is how you operate it.

---

## Part A — What's wired (code-complete)

### Remote config (`app_config` table + `src/lib/featureFlags.ts`)
A single row (`id = 1`) the app reads on launch and refreshes every ~5 minutes:

```jsonc
// app_config.flags
{
  "coach":         { "enabled": true, "rolloutPercentage": 25 },
  "paywall":       { "enabled": true },
  "notifications": { "enabled": true },
  "feedback":      { "enabled": true }
}
// app_config.min_supported_version = "1.1.0"   // "" = never force update
```

- **Kill-switch** — set `"enabled": false` to turn a feature OFF instantly for
  everyone. The Coach tab shows an "unavailable" state; the profile hides the
  feedback entry, etc. `enabled: false` always wins over any rollout %.
- **Staged rollout** — `rolloutPercentage` (0–100) releases a flag to a stable
  slice of users. Bucketing is a deterministic hash of `(flagKey, userId)`, so
  a user never flips in/out on relaunch, and each flag buckets independently.
  Ramp by editing the number: `10 → 25 → 50 → 100`. Signed-out users only ever
  see 0%/100% flags (never a partial rollout), for a consistent pre-login UX.
- **Force-update** — set `min_supported_version` above a bad build's version to
  show a blocking "update required" screen (`UpdateGate`). No client can bypass
  it. Uses semver compare; `""` disables it.

On any config-fetch failure the app falls back to `DEFAULT_CONFIG` (everything
**on**) — an outage never dark-launches the whole app.

> Config is world-readable to authenticated users but has **no client write
> policy**: only the Supabase dashboard / service role can flip switches.

### Monitoring (`src/lib/analytics.ts`)
`track(event, props)` records a typed product event as a Sentry breadcrumb, so
a crash report carries the trail of what the user did just before it. Events are
a closed union (`lesson_completed`, `paywall_viewed`, `coach_question_asked`,
`subscription_started`, `feedback_submitted`, …) — no free-form strings.
`track()` never throws into a user flow.

### In-app feedback (`user_feedback` table + `app/feedback.tsx`)
Profile → "Send feedback" opens a modal (category chips + message). Submissions
are validated (`src/lib/feedback.ts`), written to `user_feedback` with app
version + platform context, and emit a `feedback_submitted` event. RLS: users
insert/read only their own rows; you read the whole table from the dashboard.

---

## Part B — Operator runbook

### Apply the migration
Run `supabase/migrations/0004_launch_ops.sql` in the SQL Editor (after 0001–0003
+ seed). It creates both tables, RLS, and seeds the `app_config` row (all on).

### Pull a kill-switch (live incident)
Supabase → Table editor → `app_config` (row 1) → edit `flags` JSON →
`"coach": { "enabled": false }` → save. Users pick it up within ~5 min (or on
next launch). Revert by flipping back to `true`.

### Run a staged rollout of a new feature
1. Ship the feature already gated behind a flag, defaulted to a small %.
2. Watch Sentry (crash-free rate) + the feature's analytics events.
3. Ramp `rolloutPercentage` up over hours/days. Roll back to `0` (or
   `enabled: false`) at any sign of trouble — no app update required.

### Force an update after a bad release
Set `min_supported_version` to the first *good* version (e.g. `"1.0.1"`). Bump
`APP_VERSION` in `src/lib/appInfo.ts` **and** `version` in `app.json` together
for every release (a test enforces they match). Replace the placeholder store
URLs in `src/components/UpdateGate.tsx` before submission.

### Read feedback
Supabase → `user_feedback`, sorted by `created_at desc`. Filter by `category`
(`bug` / `idea` / `content` / `other`).

---

## Outstanding manual steps
- [ ] Run migration `0004_launch_ops.sql`.
- [ ] Replace placeholder store URLs in `src/components/UpdateGate.tsx`.
- [ ] Confirm `APP_VERSION` (appInfo.ts) matches `app.json` on every release.
- [ ] (Optional) Build a Sentry dashboard over the `analytics` breadcrumbs, or
      forward events to a product-analytics tool if you add one later.
