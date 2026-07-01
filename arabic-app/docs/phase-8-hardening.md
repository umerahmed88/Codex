# Phase 8 — Reliability Hardening Checklist

"It never breaks" is a set of verifiable practices, not a wish. This is the
checklist and where each item lives.

## Automated tests (run: `npm test`)

53 tests, all pure logic — no device or backend needed, so they run in CI in
seconds. Coverage of the bug-prone areas the plan called out:

| Area | File | Why it matters |
|------|------|----------------|
| Streak state machine | `streak.test.ts` | yesterday/missed/same-day, month & year boundaries, leap year, backwards clock |
| XP / level math | `xp.test.ts` | curve + progress-bar thresholds |
| Milestone triggers | `milestones.test.ts` | fire only on the exact threshold day |
| Offline sync queue | `offlineQueue.test.ts` | enqueue/dedupe/remove, corrupt-storage safety |
| Coach rate limiting | `coach.test.ts` | free vs paid boundaries |
| Entitlement gating | `entitlements.test.ts` | free/premium/locked/subscribed matrix |
| Lesson selection | `lessonProgress.test.ts` | which lesson shows "today" |
| Locale parity | `i18n.test.ts` | fails if any ar/en string is missing or empty |

## E2E critical path (`.maestro/critical-path.yaml`)

Maestro drives the real app: onboarding → log in → complete a lesson → hit the
paywall → ask the coach. Runs on a device/emulator against a seeded backend
(not in Codespaces):

```bash
maestro test .maestro/critical-path.yaml
```

## Error boundaries & network states

- **Every screen** renders under the global `ErrorBoundary` (root layout) with
  an Arabic fallback + retry. A thrown render error shows the fallback, not a
  white screen.
- **Every network call** goes through React Query hooks that expose
  `isLoading` / `isError`; screens render explicit loading, error, and empty
  states (Today, Learn, Coach, lesson player).
- **Offline**: `OfflineBanner` shows app-wide when the device drops off; lesson
  completion queues offline and replays on reconnect (`useOfflineSync`).

## Crash reporting (Sentry)

- Initialized at the app entry point (`src/lib/sentry.ts`); the ErrorBoundary
  also reports boundary-caught errors.
- **Source maps**: the `@sentry/react-native/expo` plugin (in `app.json`)
  uploads source maps during EAS builds, so production stack traces are
  readable. Set the `organization`/`project` and the Sentry auth token as an
  EAS secret before a production build.

## Performance

- **Hermes** engine enabled (`"jsEngine": "hermes"` in `app.json`) — faster
  cold start and lower memory.
- **Virtualized lists**: the Learn screen uses `FlatList` (renders only visible
  rows), so a long track stays smooth.
- Fonts are preloaded before the splash hides, avoiding a flash of unstyled text.

## Verify

- [ ] `npm test` passes (53 tests)
- [ ] `npx tsc --noEmit` is clean
- [ ] `maestro test .maestro/critical-path.yaml` passes on a device/emulator
- [ ] A deliberately thrown production error shows a readable, source-mapped
      trace in Sentry
