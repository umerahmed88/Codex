-- ============================================================================
-- Phase 10 — Launch ops: remote config, kill-switches & user feedback
-- ============================================================================
-- Two capabilities we need the day we go live:
--   1. app_config    — a single remote-config row the app reads on launch:
--                       feature flags / kill-switches (turn Coach or the
--                       paywall off instantly) + staged-rollout percentages +
--                       a force-update floor. No app rebuild required to pull
--                       any of these levers.
--   2. user_feedback — an in-app feedback inbox so we hear about launch-day
--                       problems (bad Arabic, bugs, ideas) directly from users.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- app_config: exactly one row (id = 1). World-readable to every authenticated
-- user; writable only from the Supabase dashboard / service role (no client
-- write policy → the anon/auth key cannot flip your own kill-switches).
-- ----------------------------------------------------------------------------
create table if not exists public.app_config (
  id                    integer primary key default 1,
  -- JSON blob matching AppConfig['flags'] in src/lib/featureFlags.ts, e.g.
  --   { "coach": { "enabled": true, "rolloutPercentage": 25 } }
  flags                 jsonb   not null default '{}'::jsonb,
  -- Builds older than this see the "update required" screen. '' = never block.
  min_supported_version text    not null default '',
  updated_at            timestamptz not null default now(),
  -- Enforce the single-row invariant.
  constraint app_config_singleton check (id = 1)
);

-- Seed the singleton row with everything ON (safe defaults; see DEFAULT_CONFIG).
insert into public.app_config (id, flags, min_supported_version)
values (
  1,
  '{"coach":{"enabled":true},"paywall":{"enabled":true},"notifications":{"enabled":true},"feedback":{"enabled":true}}'::jsonb,
  ''
)
on conflict (id) do nothing;

alter table public.app_config enable row level security;

-- Readable by any logged-in user; no write policy = clients can't modify it.
create policy "app_config readable by all authenticated"
  on public.app_config for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- user_feedback: each user can insert and read only their OWN feedback.
-- We (staff) read the whole table from the dashboard via the service role.
-- ----------------------------------------------------------------------------
create table if not exists public.user_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  category    text not null check (category in ('bug', 'idea', 'content', 'other')),
  message     text not null check (char_length(message) between 1 and 2000),
  app_version text not null default '',
  platform    text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_user_feedback_user on public.user_feedback (user_id);
create index if not exists idx_user_feedback_created on public.user_feedback (created_at desc);

alter table public.user_feedback enable row level security;

create policy "feedback insert own"
  on public.user_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "feedback select own"
  on public.user_feedback for select
  to authenticated
  using (auth.uid() = user_id);
