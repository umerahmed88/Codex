# Phase 11 — Server Authority Setup

Three trust fixes: rewards are now computed server-side, subscription state is
webhook-driven, and the coach has abuse guards. Here's what to deploy/configure.

## 1. Run migration 0005 (required)

In the Supabase SQL Editor (or `supabase db push`), run
`supabase/migrations/0005_complete_lesson_rpc.sql` **after** 0001–0004.

What it does:
- Adds `complete_lesson(lesson_id, completed_day)` — one atomic, SECURITY
  DEFINER function that marks the lesson complete, awards XP (atomic
  increment), advances the streak (same rules as the tested client state
  machine), and unlocks the next lesson. Idempotent: re-completing a lesson
  returns current totals without double-awarding.
- **Revokes client write access** to `lesson_progress`, `streaks`, and `xp`
  (reads unchanged). A tampered client can no longer set `total_xp = 999999`.

The app already calls the RPC (`src/lib/completeLesson.ts`); offline replays
pass the originally-completed day, which the server clamps to today at most.

## 2. Deploy the RevenueCat webhook (required once you have RevenueCat)

```bash
supabase functions deploy revenuecat-webhook
supabase secrets set REVENUECAT_WEBHOOK_SECRET=$(openssl rand -hex 24)
```

Then in the RevenueCat dashboard → **Integrations → Webhooks**:
- URL: `https://<PROJECT_REF>.functions.supabase.co/revenuecat-webhook`
- Authorization header value: the same secret you set above.

Event mapping: purchases/renewals/uncancellations → `active`; `EXPIRATION` →
`free`. `CANCELLATION` is deliberately ignored (entitlement stays active until
period end; `EXPIRATION` follows). The in-app sync remains as a fast path;
this webhook is the authority — an expired subscription now downgrades even
if the user never reopens the app.

## 3. Redeploy the coach function (picks up the new guards)

```bash
supabase functions deploy coach
```

New guards (both mirrored client-side in `src/lib/coach.ts`):
- Question length capped at **500 chars** → `400 question_too_long`
- Burst limit **3 questions/minute** (paid users too) → `429 rate_limited_burst`
- The free tier's 3/day limit is unchanged.

## Verify

- [ ] Completing a lesson still awards XP and advances the streak (now via RPC).
- [ ] Completing the same lesson twice does NOT double-award XP.
- [ ] A direct `update xp set total_xp=...` from the app's anon key fails (RLS).
- [ ] A RevenueCat sandbox purchase flips `users.subscription_status` to
      `active` via the webhook (check the function logs); an expiry flips it back.
- [ ] A 501-char coach question is rejected; a 4th question within a minute is
      rejected with `rate_limited_burst`.
