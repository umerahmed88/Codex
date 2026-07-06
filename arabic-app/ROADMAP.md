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

**Tests:** 125 passing (logic + component). `tsc` clean, `lint` clean.

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
