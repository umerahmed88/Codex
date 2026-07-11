# Roadmap — done & deferred

Where the project stands after the improvement roadmap (Phases 11–16). For the
full project state and setup steps, see `HANDOFF.md`.

## Done

### Build (Phases 1–10)
RTL/i18n skeleton, Supabase backend + RLS + auth, lesson player, streak/XP
engine, offline sync, gamification, retrieval-grounded AI coach, subscriptions
& paywall, onboarding, test suite + E2E, CI/CD + EAS, launch ops (remote config,
kill-switches, force-update, in-app feedback).

### Improvements (Phases 11–16)
- **11 — Server authority**: atomic `complete_lesson` RPC + RLS lockdown (clients
  can no longer forge XP/streak); RevenueCat webhook as subscription authority;
  coach abuse guards (length cap, per-minute burst limit).
- **12 — Quality**: ESLint + CI lint step; persisted language choice; RNTL
  component render tests (jest projects).
- **13 — Coach v2**: streaming answers (`expo/fetch`, graceful fallback);
  conversation memory (last 6 turns); optional pgvector semantic retrieval with
  FTS fallback + `embed-lessons` indexer.
- **14 — Content pipeline**: pure validator + CSV/JSON import script
  (`--dry-run`); authoring template & guide; second track (Self-Confidence);
  multi-track UI (persisted selection, switcher, onboarding-interest mapping).
- **15 — Growth**: PostHog dual-write (opaque id, no PII); remote push
  (`push_tokens` + registration + `send-push` fan-out); Apple/Google sign-in
  (built now, env-gated so invisible until configured).
- **16 — Ops polish**: offline lesson cache (React Query persistence, content
  only); staging environment (`.env.staging`, APP_ENV mapping, docs);
  Arabic-Indic numerals + WCAG AA contrast fixes (with regression tests);
  data-ops runbook.

### UI/UX overhaul (Phases U0–U4) — Duolingo-style redesign
- **U0 — Design preview**: interactive HTML mockup (Artifact) approved before
  any RN work — new palette, mascot concept, Today hero, winding path,
  celebration.
- **U1 — Foundation**: animation stack (Reanimated 4 + worklets, gesture-handler,
  svg, haptics, expo-audio, moti) on Expo Go SDK 54; `babel.config.js` with the
  worklets plugin; `GestureHandlerRootView` root. **Lumi palette** (teal-green
  primary, cream bg, purple, amber/gold XP, coral streak) — WCAG AA verified.
  New primitives: `Lumi` (animated mascot, swap-ready for real PNG sprites),
  `PressableScale` (bouncy press + haptic), `Confetti`, `AnimatedCounter`,
  `src/lib/fx.ts` (haptics + bundled synthesized WAV SFX).
- **U2 — Flagship screens**: Today hero (Lumi wave + XP count-up + bouncy CTA);
  Learn winding lesson path (RTL-aware alternating nodes, done/current/locked,
  Lumi beside the current node, colorful track pills).
- **U3 — Celebrations & micro-interactions**: full-screen `CelebrationOverlay`
  on every lesson complete (confetti + Lumi celebrate + XP/streak chips + sound
  + haptic; milestone adds fanfare); animated tab bar (icon bounce on focus);
  Lumi on onboarding.
- **U4 — Polish & verify**: `useReducedMotion` honored across all animations;
  full bilingual i18n (milestones, notifications, error boundary, learn-path
  labels all localized); final tsc/tests/lint/export green.

**Security:** migration `0008_security_hardening.sql` closes the
client-forgeable `subscription_status` hole, blocks XP farming on locked
lessons, and fixes offline-replay / non-UTC streak math (**user must run it**).

**Tests:** 138 passing (logic + component). `tsc` clean, `lint` clean, iOS
bundle exports (runs in Expo Go).

### Ship-readiness pass (post-redesign)
- Real Arabic pluralization (6 CLDR forms, engine-independent) + Arabic-Indic
  digits in every counted phrase; retry buttons on all error states; abortable
  coach streaming; virtualized lesson path; branded icon/splash set + splash
  config; Profile milestone nudge. Tests: **165 passing**.

## Deferred (intentionally not built)

- **Audio/video lessons** — schema supports `media_type`/`media_url`, but the
  player is text-only. Add when content warrants it.
- **Leaderboards / social features** — out of scope for the current
  single-player self-improvement loop.
- **In-app content authoring UI** — content goes through the CSV pipeline; a
  CMS is overkill until a non-technical team authors regularly.
- **Web build** — the code paths guard for web, but the product target is
  native iOS/Android; no web QA has been done.
- **A third track (Leadership)** — onboarding offers the interest; add the
  track content via the pipeline when ready (`interestLeadership` currently
  maps to the communication track).
- **Push campaign scheduling UI** — `send-push` is the primitive; scheduling is
  done manually via curl/cron for now.

## Before store submission (from HANDOFF)

Live accounts and placeholder swaps still required: Supabase project +
migrations, RevenueCat + store IAP, `EXPO_TOKEN`, real legal URLs, Sentry
org/project, force-update store URLs. See `HANDOFF.md` → "Outstanding manual
steps".
