# Staging environment (Phase 16)

A staging environment lets you test migrations, content, and builds against a
**separate backend** before they reach real users. Nothing here is required to
ship, but it's the difference between "test in production" and not.

## The model

`APP_ENV` (set per EAS build profile in `eas.json`) selects the environment:

| APP_ENV | Profile | Backend | Who |
|---------|---------|---------|-----|
| `development` | `development` | your dev Supabase | you, locally |
| `preview` | `preview` | **staging** Supabase | QA / internal testers |
| `production` | `production` | production Supabase | the store build |

The app reads `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` at build time
(`src/lib/supabase.ts`); EAS injects the right values from the profile's `env`
block plus the matching `.env` file. Because the keys are `EXPO_PUBLIC_*`, they
are baked into each build — so a staging build talks to staging, a production
build talks to production, with no runtime switch to get wrong.

## One-time setup

1. **Create a second (free) Supabase project** named e.g. `arabic-app-staging`.
2. **Run migrations in order** in its SQL Editor — same sequence as production:
   `0001` → `0002` → `0003` → `0004` → `0005` → `0006` → `0007`, then
   `seed.sql`. (Keeping the order identical is the whole point — you're
   rehearsing the exact production migration path.)
3. **Copy `.env.staging.example` → `.env.staging`** and fill in the staging
   project's URL + anon key (and staging RevenueCat / PostHog if used).
4. **Deploy Edge Functions** to the staging project and set their secrets
   (`ANTHROPIC_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `SEND_PUSH_SECRET`,
   optionally `VOYAGE_API_KEY`) — same commands as production, different
   `supabase link`.

## Workflow

- **Migrations & content**: apply to staging first, smoke-test, then production.
  Run `npx tsx scripts/import-lessons.ts <file> --dry-run` locally, import to
  staging, verify in a `preview` build, then import to production.
- **Builds**: `eas build --profile preview` produces the staging build for
  internal distribution; `--profile production` is the store build.
- **Sentry**: events are tagged with the environment automatically, so a
  single Sentry project can separate staging noise from production issues.

## Guardrail

Never point a `preview`/staging build at the production Supabase project — the
whole value is an isolated place to break things. The separate anon key is your
safety line.
