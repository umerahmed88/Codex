# Arabic Self-Improvement App — Project Handoff / State

> **Read this first.** It's the single source of truth for continuing this
> project in a fresh session. Everything below is already committed to git.

## What this is

A native mobile app (iOS + Android) for the Arabic-speaking market: daily
bite-sized personal-development lessons (Communication & Charisma track), an AI
"ask-the-coach" Q&A grounded strictly in the lesson content, a streak/XP
gamification loop, and a subscription paywall. RTL-first, Arabic primary.

**Stack:** Expo (SDK 54) + React Native + TypeScript (strict) · Expo Router ·
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

**Improvement roadmap (Phases 11–16, from the post-launch audit):**

| Phase | What | Status |
|-------|------|--------|
| 11 | Server authority: complete_lesson RPC + RLS lockdown, RevenueCat webhook, coach abuse guards | ✅ |
| 12 | Quality: ESLint+CI, persisted locale, component tests | ✅ |
| 13 | Coach v2: streaming, conversation memory, pgvector (optional) | ✅ |
| 14 | Content pipeline: import script, template, second track + multi-track UI | ✅ |
| 15 | Growth: PostHog, remote push, Apple/Google sign-in | ✅ |
| 16 | Ops: offline lesson cache, staging env, a11y/numerals, data ops | ✅ |

**Improvement roadmap COMPLETE.** See `ROADMAP.md` for the done/deferred summary.

**UI/UX overhaul (Phases U0–U4) — Duolingo-style redesign, COMPLETE:**

| Phase | What | Status |
|-------|------|--------|
| U0 | Design preview (HTML Artifact, approved) | ✅ |
| U1 | Animation stack + Lumi palette + primitives (`Lumi`, `PressableScale`, `Confetti`, `AnimatedCounter`, `fx.ts`) | ✅ |
| U2 | Flagship screens: Today hero + Learn winding path | ✅ |
| U3 | Celebrations (`CelebrationOverlay`) + animated tab bar + onboarding Lumi | ✅ |
| U4 | Polish: reduce-motion, full bilingual i18n, verify | ✅ |

- **Animation stack** (all Expo Go SDK 54 safe): `react-native-reanimated ~4.1.1`
  + `react-native-worklets 0.5.1` (needs `react-native-worklets/plugin` in
  `babel.config.js`), `react-native-gesture-handler`, `react-native-svg`,
  `expo-haptics`, `expo-audio`, `moti`. Root wrapped in `GestureHandlerRootView`.
- **Lumi** (`src/components/Lumi.tsx`) is the mascot — currently an animated SVG
  placeholder in Lumi's palette. **Swap-ready for real art:** `assets/lumi/`
  already holds 5 transparent 1×1 placeholder PNGs wired via `require`, so
  turning on the real art is a **one-line change** (`USE_REAL_ART = true`) once
  you replace those files with the real transparent-background renders. Which
  design-sheet expression goes in each file:
  - `idle.png` ← **Happy** · `wave.png` ← **Bye** · `celebrate.png` ← **Excited**
    · `encourage.png` ← **Encouraging** · `sad.png` ← **Sad**
  - To cut them from the composite sheet: on iPhone, long-press the character to
    lift it off the background (or use remove.bg / Photoroom), export each as PNG
    with a transparent background, name them exactly as above, and drop them into
    `arabic-app/assets/lumi/`. The `<Lumi state=… size=… />` API never changes.
- **RTL is pinned to native LTR** (`app/_layout.tsx`: `allowRTL(false)` +
  `forceRTL(false)`). Direction is controlled entirely in the stylesheets
  (explicit `row-reverse` + `textAlign:'right'`), because native `forceRTL(true)`
  was unreliable in Expo Go (only flips after a native restart → inconsistent
  layout between launches). After pulling this change, **fully quit and reopen**
  the app once so the native flag clears.
- Theme is the **Lumi palette** (`src/theme/index.ts`); all pairs WCAG-AA
  verified in `src/__tests__/contrast.test.ts`.

**Tests:** `npm test` → 138 passing (logic + component projects). `npx tsc --noEmit` clean. `npm run lint` clean. `npx expo export --platform ios` bundles.

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
                        # 0004 launch ops, 0005 complete_lesson RPC,
                        # 0006 coach embeddings (pgvector), 0007 push_tokens
    seed.sql            # 2 tracks × 7 lessons (Communication, Confidence)
    functions/          # coach + revenuecat-webhook + send-push (Deno)
  scripts/              # embed-lessons.ts + import-lessons.ts (npx tsx, --dry-run)
  content/template.csv  # lesson authoring template (docs/content-pipeline.md)
  locales/ar.json, en.json
  .maestro/critical-path.yaml   # E2E flow
  docs/                 # setup + ops guides (per-phase); content-pipeline,
                        # phase-15-growth, staging-environment, data-ops
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

- [ ] **🔒 SECURITY — run `supabase/migrations/0008_security_hardening.sql`** in
      the SQL Editor now. It closes a critical hole (any client could self-grant
      `subscription_status='active'`), stops XP farming on locked lessons, and
      fixes the streak math for offline replays + non-UTC timezones. Safe to run
      on the existing DB (create-or-replace only).
- [ ] **Supabase project** — create it, then run `supabase/migrations/0001`
      through `0008`, and `seed.sql`, in order, in the SQL Editor.
      (A Supabase platform OUTAGE was blocking the SQL Editor as of last session
      — check https://status.supabase.com; it's temporary, not our bug.)
- [ ] **`.env.local`** — set `EXPO_PUBLIC_SUPABASE_URL` + `_ANON_KEY`
      (the "publishable" `sb_...` key), from Supabase → Settings → API.
- [ ] **Coach Edge Function** — `supabase functions deploy coach` and
      `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (see docs/phase-5-setup.md).
- [ ] **(Optional) Semantic coach retrieval** — set `VOYAGE_API_KEY` secret and
      run `npx tsx scripts/embed-lessons.ts`; without it the coach uses FTS
      (see the Coach v2 section of docs/phase-5-setup.md).
- [ ] **(Optional) Growth features** — PostHog (`EXPO_PUBLIC_POSTHOG_KEY`),
      remote push (run migration `0007`, deploy `send-push`, set
      `SEND_PUSH_SECRET`), and Apple/Google sign-in (provider config +
      `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`). All stay off until configured —
      see docs/phase-15-growth.md.
- [ ] **RevenueCat webhook** — `supabase functions deploy revenuecat-webhook`,
      set `REVENUECAT_WEBHOOK_SECRET`, point RevenueCat's webhook at it
      (see docs/phase-11-server-authority.md).
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
