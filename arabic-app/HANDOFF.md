# Arabic Self-Improvement App — Project Handoff / State

> **Read this first.** It's the single source of truth for continuing this
> project in a fresh session. Everything below is already committed to git.

## What this is

A native mobile app (iOS + Android) for the Arabic-speaking market: daily
bite-sized personal-development lessons (Communication & Charisma track), an AI
"ask-the-coach" Q&A grounded strictly in the lesson content, a streak/XP
gamification loop, and a subscription paywall. RTL-first, Arabic primary.

**Stack:** Expo (SDK 57) + React Native + TypeScript (strict) · Expo Router ·
Supabase (Postgres + Auth) · React Query · Zustand · RevenueCat (IAP) ·
Sentry · Claude API (`claude-opus-4-8`) via a Supabase Edge Function.

## Build status — Phases 1–10 DONE 🎉

| Phase | What | Status |
|-------|------|--------|
| 1 | Skeleton: RTL, i18n, error boundary, Sentry, theme | ✅ |
| 2 | Backend: Supabase schema, RLS, auth, typed hooks, seed | ✅ |
| 3 | Lesson player, streak/XP engine, offline sync | ✅ |
| 4 | Gamification: streak badge, levels, reminders, milestones | ✅ |
| 5 | AI Coach: retrieval-grounded, cited Q&A (Edge Function) | ✅ |
| 6 | Subscriptions & paywall (RevenueCat + IAP) | ✅ |
| 7 | Onboarding & polish (offline banner, legal links, a11y) | ✅ |
| 8 | Test suite (53 tests) + reliability hardening + Maestro E2E | ✅ |
| 9 | CI/CD (GitHub Actions) + EAS build/update + store guide | ✅ |
| 10 | Launch ops: remote config, kill-switches, staged rollout, force-update, monitoring, in-app feedback | ✅ |

**Tests:** `npm test` → 78 passing. `npx tsc --noEmit` → clean.

## Repo layout

```
arabic-app/
  app/                  # Expo Router screens
    (onboarding)/       # first-run flow
    (auth)/             # login / signup / forgot-password
    (tabs)/             # Today / Learn / Coach / Profile
    lesson/[id].tsx     # lesson player
    paywall.tsx         # subscription paywall (modal)
    _layout.tsx         # providers + AuthGate (onboarding→auth→app routing)
  src/
    components/         # Button, TextField, StreakBadge, LevelProgress, etc.
    hooks/              # useTracks, useProgress, useCompleteLesson, useCoach, ...
    lib/                # supabase, AuthProvider, SubscriptionProvider, streak,
                        # xp, milestones, entitlements, coach, notifications, ...
    types/database.ts   # TS types mirroring the SQL schema
    __tests__/          # 9 test files (all pure logic)
  supabase/
    migrations/         # 0001 schema, 0002 RLS, 0003 coach retrieval,
                        # 0004 launch ops (app_config + user_feedback)
    seed.sql            # 1 track + 7 lessons
    functions/coach/    # Deno Edge Function (holds the Claude key)
  locales/ar.json, en.json
  .maestro/critical-path.yaml   # E2E flow
  docs/                 # phase-2/-5/-6/-8/-9 setup + phase-10 launch ops
```

## How to run (in a Codespace — see docs/running-in-codespaces.md)

```bash
cd arabic-app
cp .env.example .env.local     # fill in the keys below
npm install --legacy-peer-deps
npx expo start --tunnel        # scan QR with Expo Go
```

## ⚠️ OUTSTANDING MANUAL STEPS (the app is code-complete; these make it RUN)

These need YOUR accounts and can't be done from code:

- [ ] **Supabase project** — create it, then run `supabase/migrations/0001`,
      `0002`, `0003`, `0004`, and `seed.sql` in the SQL Editor.
      (A Supabase platform OUTAGE was blocking the SQL Editor as of last session
      — check https://status.supabase.com; it's temporary, not our bug.)
- [ ] **`.env.local`** — set `EXPO_PUBLIC_SUPABASE_URL` + `_ANON_KEY`
      (the "publishable" `sb_...` key), from Supabase → Settings → API.
- [ ] **Coach Edge Function** — `supabase functions deploy coach` and
      `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (see docs/phase-5-setup.md).
- [ ] **RevenueCat + store IAP products** — needed for the paywall
      (see docs/phase-6-setup.md). Requires Apple Developer ($99) + Play ($25).
- [ ] **`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`** in `.env.local`.
- [ ] **`EXPO_TOKEN`** GitHub secret — for the EAS build workflow.
- [ ] **Legal URLs** — replace the `example.com` Privacy/Terms placeholders in
      `app/(tabs)/profile.tsx` before store submission.
- [ ] **Sentry** — set org/project in `app.json` and the Sentry auth token as
      an EAS secret for source-map upload.
- [ ] **Store URLs for force-update** — replace the placeholder App Store /
      Play URLs in `src/components/UpdateGate.tsx` before submission.
      (See `docs/phase-10-launch-ops.md` for the full launch-ops runbook.)

## Git / workflow rules

- Work happens on branch **`claude/new-repo-folder-u8r4th`**; PRs merge into `main`.
- Commits must be authored `Claude <noreply@anthropic.com>` (there's a stop
  hook that enforces this).
- After a PR merges, restart the branch from `main`:
  `git fetch origin main && git checkout -B claude/new-repo-folder-u8r4th origin/main`
- Pushing requires the **Claude GitHub App installed** on the repo with
  Contents: read & write (https://github.com/apps/claude/installations/new).

## To continue in a fresh session

All 10 build phases are complete. What remains is the **manual setup** above
(your Supabase / RevenueCat / store accounts) to actually run and ship the app.
Everything needed to resume is in this file + the `docs/` folder.
