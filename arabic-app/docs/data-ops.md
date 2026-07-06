# Data operations runbook (Phase 16)

Operational practices for the production Supabase database once real users
exist. Short and practical — the things that hurt if you skip them.

## Backups & recovery

- **Enable Point-in-Time Recovery (PITR)** in Supabase → Database → Backups.
  Daily snapshots alone lose up to 24h; PITR lets you restore to any moment,
  which is what you want after an accidental bad migration or bulk delete.
- **Before every production migration**: confirm a recent backup exists, and
  rehearse the migration on staging first (see `docs/staging-environment.md`).
  Migrations here are written idempotent (`if not exists` / `or replace`) so a
  re-run is safe, but a backup is the real safety net.
- **Test a restore once** into a throwaway project — an untested backup is a
  hope, not a plan.

## Row-Level Security invariant

Every user-data table must have RLS enabled with own-rows policies. Current
tables and their guard:

| Table | Write path | RLS |
|-------|-----------|-----|
| `lesson_progress`, `streaks`, `xp` | **RPC only** (`complete_lesson`, SECURITY DEFINER) — client writes revoked | read own rows |
| `coach_messages` | client insert (own rows) | own rows |
| `push_tokens` | client upsert (own rows) | own rows |
| `user_feedback` | client insert (own rows) | insert own; no client read |
| `users` | trigger on signup; `subscription_status` via webhook (service role) | read own row |

When you add a table, add its RLS policies **in the same migration** — never a
follow-up. The service role (Edge Functions) bypasses RLS by design; keep those
functions behind shared secrets.

## Feedback triage (`user_feedback`)

In-app feedback (Phase 10) lands in `public.user_feedback` with
`category ∈ {bug, idea, content, other}`, `app_version`, and `platform`.

Suggested weekly pass (SQL Editor):

```sql
-- New feedback in the last 7 days, newest first
select created_at, category, app_version, platform, message
from public.user_feedback
where created_at > now() - interval '7 days'
order by created_at desc;
```

- **bug** → reproduce on the reported `app_version` / `platform`; file an issue.
- **content** → feed into the content pipeline (`docs/content-pipeline.md`).
- **idea** → roadmap backlog.
- Retention: feedback is user-authored text — honor deletion requests (see
  below) and don't export it with PII attached.

## Account deletion / data requests (PDPL / GDPR)

- A user's rows cascade from `users.id` (foreign keys use `on delete cascade`),
  so deleting the auth user removes their progress, streaks, xp, coach
  messages, push tokens, and feedback in one step.
- Handle deletion requests by deleting the auth user (Supabase → Authentication
  → Users), then confirm no orphaned rows remain.
- PostHog identities are the opaque user id only; issue a PostHog delete for
  that id as part of the same request.

## Monitoring

- **Sentry** for crashes/errors (already wired, `src/lib/sentry.ts`),
  environment-tagged.
- **Supabase dashboard** for DB size, slow queries, and Edge Function logs
  (`console.error` in the functions surfaces here).
- Watch the coach function's cost: the abuse guards (500-char cap, 3/min burst,
  free daily limit) bound it, but review usage after launch.
