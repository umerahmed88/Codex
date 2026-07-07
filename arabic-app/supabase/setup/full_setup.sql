-- ============================================================================
-- FULL SETUP — paste this whole file into the Supabase SQL Editor and Run.
-- It is migrations 0001–0007 + seed.sql concatenated in order.
-- Safe to re-run: every statement is idempotent (if not exists / on conflict).
-- Generated from supabase/migrations/*.sql + seed.sql — do not edit by hand.
-- ============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  0001_initial_schema.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Phase 2 — Initial schema for the Arabic self-improvement app
-- ============================================================================
-- This file defines every table the app needs. Run it once against your
-- Supabase project (via the SQL Editor or `supabase db push`).
--
-- Naming: snake_case columns, plural table names. Every table has a UUID
-- primary key and created_at timestamp for auditability.
-- ============================================================================

-- Enable the UUID generator (Supabase ships with pgcrypto available)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- users — one row per person. Mirrors Supabase's auth.users but holds the
-- app-specific profile fields. Linked 1:1 to auth.users via id.
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text unique not null,
  display_name        text,
  locale              text not null default 'ar',
  subscription_status text not null default 'free', -- 'free' | 'active' | 'expired'
  created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- tracks — a themed course (e.g. "Communication & Charisma"). Content, not
-- user data, so it is world-readable.
-- ----------------------------------------------------------------------------
create table if not exists public.tracks (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title_ar       text not null,
  title_en       text,
  description_ar text,
  description_en text,
  "order"        integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- lessons — one daily lesson inside a track.
-- ----------------------------------------------------------------------------
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid not null references public.tracks (id) on delete cascade,
  day_number  integer not null,
  title_ar    text not null,
  body_ar     text not null,
  media_url   text,
  media_type  text not null default 'text', -- 'text' | 'audio' | 'video'
  est_minutes integer not null default 5,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (track_id, day_number)
);

-- ----------------------------------------------------------------------------
-- lesson_progress — tracks each user's status on each lesson.
-- ----------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  status       text not null default 'locked', -- 'locked' | 'available' | 'completed'
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ----------------------------------------------------------------------------
-- streaks — one row per user, the daily-habit counter.
-- ----------------------------------------------------------------------------
create table if not exists public.streaks (
  user_id          uuid primary key references public.users (id) on delete cascade,
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_active_date date
);

-- ----------------------------------------------------------------------------
-- xp — one row per user, the experience-point total.
-- ----------------------------------------------------------------------------
create table if not exists public.xp (
  user_id   uuid primary key references public.users (id) on delete cascade,
  total_xp  integer not null default 0
);

-- ----------------------------------------------------------------------------
-- coach_messages — the AI coach Q&A history (populated in Phase 5).
-- ----------------------------------------------------------------------------
create table if not exists public.coach_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  question        text not null,
  answer          text,
  cited_lesson_id uuid references public.lessons (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Helpful indexes for the queries the app runs most often
create index if not exists idx_lessons_track on public.lessons (track_id, "order");
create index if not exists idx_progress_user on public.lesson_progress (user_id);
create index if not exists idx_coach_user on public.coach_messages (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Auto-provision: when a new auth user signs up, create their profile rows.
-- This keeps the app tables in sync with Supabase Auth automatically.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.streaks (user_id) values (new.id);
  insert into public.xp (user_id) values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  0002_rls_policies.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Phase 2 — Row-Level Security (RLS) policies
-- ============================================================================
-- WHY THIS MATTERS: without RLS, anyone with your public API key could read
-- EVERY user's progress, streak, and coach messages. RLS is a wall enforced
-- by the database itself: each user can only touch their OWN rows.
--
-- Content tables (tracks, lessons) are world-readable — they hold no private
-- data and every logged-in user needs them.
-- ============================================================================

-- Turn RLS ON for every table. (With RLS on and no policy, access is DENIED
-- by default — a safe starting point.)
alter table public.users           enable row level security;
alter table public.tracks          enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.streaks         enable row level security;
alter table public.xp              enable row level security;
alter table public.coach_messages  enable row level security;

-- ----------------------------------------------------------------------------
-- users: a person can read and update only their own profile row.
-- ----------------------------------------------------------------------------
create policy "users read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "users update own profile"
  on public.users for update
  using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- tracks & lessons: readable by any authenticated user (they are content).
-- No insert/update/delete policy → clients cannot modify content.
-- ----------------------------------------------------------------------------
create policy "tracks readable by all authenticated"
  on public.tracks for select
  to authenticated
  using (true);

create policy "lessons readable by all authenticated"
  on public.lessons for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- lesson_progress: full CRUD, but ONLY on rows the user owns.
-- ----------------------------------------------------------------------------
create policy "progress select own"
  on public.lesson_progress for select
  using (auth.uid() = user_id);

create policy "progress insert own"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "progress update own"
  on public.lesson_progress for update
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- streaks: read & update own row only.
-- ----------------------------------------------------------------------------
create policy "streaks select own"
  on public.streaks for select
  using (auth.uid() = user_id);

create policy "streaks update own"
  on public.streaks for update
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- xp: read & update own row only.
-- ----------------------------------------------------------------------------
create policy "xp select own"
  on public.xp for select
  using (auth.uid() = user_id);

create policy "xp update own"
  on public.xp for update
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- coach_messages: read & insert own only.
-- ----------------------------------------------------------------------------
create policy "coach select own"
  on public.coach_messages for select
  using (auth.uid() = user_id);

create policy "coach insert own"
  on public.coach_messages for insert
  with check (auth.uid() = user_id);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  0003_coach_retrieval.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Phase 5 — Retrieval for the AI Coach
-- ============================================================================
-- The coach must answer ONLY from our lesson content. This migration adds a
-- full-text search function that returns the lessons most relevant to a
-- question, so the Edge Function can send ONLY those excerpts to the LLM.
--
-- We use Postgres full-text search (the 'simple' config tokenizes Arabic text
-- without stemming, which works well for keyword matching). This needs no
-- external embeddings API, so it runs the moment you have a Supabase project.
-- The production upgrade path — pgvector semantic embeddings — is noted in
-- docs/phase-5-setup.md; the Edge Function is structured so it can be swapped
-- in without touching the app.
-- ============================================================================

-- A generated tsvector column over the searchable lesson text, kept in sync
-- automatically by Postgres.
alter table public.lessons
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('simple', coalesce(title_ar, '') || ' ' || coalesce(body_ar, ''))
  ) stored;

create index if not exists idx_lessons_search on public.lessons using gin (search_vector);

-- match_lessons: given a free-text question, return the top-N most relevant
-- lessons ranked by relevance. SECURITY DEFINER so the Edge Function can call
-- it; it only reads content (no private data), so this is safe.
create or replace function public.match_lessons(query_text text, match_count integer default 3)
returns table (
  id uuid,
  track_id uuid,
  day_number integer,
  title_ar text,
  body_ar text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.track_id,
    l.day_number,
    l.title_ar,
    l.body_ar,
    ts_rank(l.search_vector, websearch_to_tsquery('simple', query_text)) as rank
  from public.lessons l
  where l.search_vector @@ websearch_to_tsquery('simple', query_text)
  order by rank desc
  limit greatest(match_count, 1);
$$;

-- Allow authenticated users (and the service role) to call it.
grant execute on function public.match_lessons(text, integer) to authenticated, service_role;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  0004_launch_ops.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  0005_complete_lesson_rpc.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Phase 11 — Server-authoritative lesson completion
-- ============================================================================
-- Until now the CLIENT computed XP and streaks and wrote them directly; RLS
-- verified row ownership but not value honesty, so a tampered client could set
-- total_xp = 999999. This migration moves the whole completion sequence into
-- one atomic SECURITY DEFINER function and revokes the client's direct write
-- access to xp / streaks / lesson_progress. The client now has exactly one way
-- to earn rewards: rpc('complete_lesson', ...), and the server does the math.
--
-- The streak rules are a 1:1 port of the tested state machine in
-- src/lib/streak.ts (same-day no-op / next-day increment / missed-day reset).
-- ============================================================================

create or replace function public.complete_lesson(
  p_lesson_id uuid,
  -- The calendar day the completion credits (offline replays pass the day the
  -- user actually completed, so a delayed sync still credits correctly).
  p_completed_day date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_day         date;
  v_lesson      record;
  v_progress    record;
  v_streak      record;
  v_new_current integer;
  v_new_longest integer;
  v_new_xp      integer;
  v_diff        integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Clamp the credited day: never in the future (client clock skew / tampering).
  v_day := least(coalesce(p_completed_day, current_date), current_date);

  select id, track_id, day_number into v_lesson
  from public.lessons where id = p_lesson_id;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  -- Idempotency: completing an already-completed lesson must not re-award
  -- XP or advance the streak (the old client code relied on a disabled button;
  -- the server now enforces it).
  select status into v_progress
  from public.lesson_progress
  where user_id = v_user_id and lesson_id = p_lesson_id;

  if found and v_progress.status = 'completed' then
    select total_xp into v_new_xp from public.xp where user_id = v_user_id;
    select current_streak, longest_streak, last_active_date into v_streak
    from public.streaks where user_id = v_user_id;
    return jsonb_build_object(
      'already_completed', true,
      'total_xp', coalesce(v_new_xp, 0),
      'current_streak', coalesce(v_streak.current_streak, 0),
      'longest_streak', coalesce(v_streak.longest_streak, 0),
      'last_active_date', v_streak.last_active_date
    );
  end if;

  -- 1. Mark completed.
  insert into public.lesson_progress (user_id, lesson_id, status, completed_at)
  values (v_user_id, p_lesson_id, 'completed', now())
  on conflict (user_id, lesson_id)
  do update set status = 'completed', completed_at = now();

  -- 2. Award XP atomically (no read-then-write race).
  update public.xp
  set total_xp = total_xp + 10
  where user_id = v_user_id
  returning total_xp into v_new_xp;
  if not found then
    insert into public.xp (user_id, total_xp) values (v_user_id, 10)
    returning total_xp into v_new_xp;
  end if;

  -- 3. Advance the streak — port of src/lib/streak.ts advanceStreak():
  --    same day → no-op; consecutive day → +1; missed day / first ever /
  --    backwards clock → reset to 1. longest_streak never decreases.
  select current_streak, longest_streak, last_active_date into v_streak
  from public.streaks where user_id = v_user_id for update;
  if not found then
    insert into public.streaks (user_id, current_streak, longest_streak, last_active_date)
    values (v_user_id, 1, 1, v_day)
    returning current_streak, longest_streak, last_active_date into v_streak;
    v_new_current := 1;
    v_new_longest := 1;
  else
    if v_streak.last_active_date is null then
      v_new_current := 1;
    else
      v_diff := v_day - v_streak.last_active_date;
      if v_diff = 0 then
        v_new_current := v_streak.current_streak;
      elsif v_diff = 1 then
        v_new_current := v_streak.current_streak + 1;
      else
        v_new_current := 1; -- missed ≥1 day, or clock went backwards
      end if;
    end if;
    v_new_longest := greatest(coalesce(v_streak.longest_streak, 0), v_new_current);

    update public.streaks
    set current_streak = v_new_current,
        longest_streak = v_new_longest,
        -- Same-day repeat keeps the existing date; otherwise credit v_day.
        last_active_date = case
          when v_streak.last_active_date is not null and v_day - v_streak.last_active_date = 0
            then v_streak.last_active_date
          else v_day
        end
    where user_id = v_user_id;
  end if;

  -- 4. Unlock the next day's lesson in the same track — but never downgrade a
  --    lesson the user already completed.
  insert into public.lesson_progress (user_id, lesson_id, status)
  select v_user_id, l.id, 'available'
  from public.lessons l
  where l.track_id = v_lesson.track_id
    and l.day_number = v_lesson.day_number + 1
  on conflict (user_id, lesson_id) do update
  set status = 'available'
  where lesson_progress.status = 'locked';

  return jsonb_build_object(
    'already_completed', false,
    'total_xp', v_new_xp,
    'current_streak', v_new_current,
    'longest_streak', v_new_longest,
    'last_active_date', v_day
  );
end;
$$;

grant execute on function public.complete_lesson(uuid, date) to authenticated;

-- ----------------------------------------------------------------------------
-- Tighten RLS: reward tables become read-only for clients. All writes now go
-- through complete_lesson() (SECURITY DEFINER bypasses RLS internally).
-- ----------------------------------------------------------------------------
drop policy if exists "progress insert own" on public.lesson_progress;
drop policy if exists "progress update own" on public.lesson_progress;
drop policy if exists "streaks update own"  on public.streaks;
drop policy if exists "xp update own"       on public.xp;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  0006_coach_embeddings.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Phase 13 — Semantic retrieval for the AI Coach (optional upgrade)
-- ============================================================================
-- Full-text search (0003) matches keywords; embeddings match MEANING — e.g.
-- "how do I make a good first impression?" finds "قوة الانطباع الأول" even
-- with zero shared words. This migration adds the storage + query function.
--
-- OPTIONAL-ON DESIGN: the coach Edge Function only uses semantic matching
-- when a VOYAGE_API_KEY secret is configured AND a lesson has an embedding;
-- otherwise it falls back to the existing FTS path. Running this migration
-- with no embeddings populated changes nothing about behavior.
--
-- Populate/refresh embeddings with: scripts/embed-lessons.ts (see
-- docs/phase-5-setup.md → Semantic retrieval).
-- ============================================================================

create extension if not exists vector;

-- 1024 dims = Voyage AI's voyage-3 model (Anthropic's recommended partner).
alter table public.lessons
  add column if not exists embedding vector(1024);

-- IVF/HNSW indexes only pay off at thousands of rows; a track catalog is tiny,
-- so exact scan is both simpler and faster here. Revisit if lessons > ~10k.

create or replace function public.match_lessons_semantic(
  query_embedding vector(1024),
  match_count integer default 3
)
returns table (
  id uuid,
  track_id uuid,
  day_number integer,
  title_ar text,
  body_ar text,
  similarity real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.track_id,
    l.day_number,
    l.title_ar,
    l.body_ar,
    (1 - (l.embedding <=> query_embedding))::real as similarity
  from public.lessons l
  where l.embedding is not null
  order by l.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_lessons_semantic(vector, integer)
  to authenticated, service_role;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  0007_push_tokens.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- 0007 — Remote push notifications (Phase 15)
-- ============================================================================
-- Stores each device's Expo push token so the send-push Edge Function can
-- reach users who opted into notifications (win-back campaigns, announcements).
-- A user can have several rows (phone + tablet); tokens are unique per device.
-- ============================================================================

create table if not exists public.push_tokens (
  token text primary key, -- ExponentPushToken[...] — unique per device install
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Own-rows only, for every operation: a user registers/refreshes/removes the
-- tokens of their own devices and can never see anyone else's. The send-push
-- Edge Function reads with the service role, which bypasses RLS.
drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete using (auth.uid() = user_id);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  seed.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Phase 2 — Seed data
-- ============================================================================
-- Inserts ONE track ("Communication & Charisma") and 7 placeholder lessons so
-- the rest of the app has real content to render during development.
-- Safe to re-run: uses a fixed track slug and ON CONFLICT guards.
-- ============================================================================

insert into public.tracks (id, slug, title_ar, title_en, description_ar, description_en, "order")
values (
  '11111111-1111-1111-1111-111111111111',
  'communication-charisma',
  'التواصل والكاريزما',
  'Communication & Charisma',
  'مسار عملي لتطوير مهارات التواصل والحضور الشخصي في سبعة أيام.',
  'A practical seven-day track to build communication skills and personal presence.',
  0
)
on conflict (slug) do nothing;

insert into public.lessons (track_id, day_number, title_ar, body_ar, media_type, est_minutes, "order")
values
  ('11111111-1111-1111-1111-111111111111', 1, 'قوة الانطباع الأول',
   'الانطباع الأول يتشكل خلال ثوانٍ. في هذا الدرس نتعلّم كيف تصنع حضوراً إيجابياً من اللحظة الأولى عبر لغة الجسد ونبرة الصوت والابتسامة الصادقة.',
   'text', 5, 1),
  ('11111111-1111-1111-1111-111111111111', 2, 'فن الإنصات الفعّال',
   'الاستماع الحقيقي أقوى من الكلام. تعلّم كيف تنصت باهتمام كامل، وتطرح أسئلة تُظهر اهتمامك، وتجعل محدّثك يشعر بأنه مسموع ومقدَّر.',
   'text', 5, 2),
  ('11111111-1111-1111-1111-111111111111', 3, 'التحدث بثقة',
   'الثقة مهارة تُكتسب. في هذا الدرس نتناول تمارين عملية للتخلص من التردد، وتنظيم أفكارك قبل الكلام، والتحدث بوضوح وهدوء.',
   'text', 6, 3),
  ('11111111-1111-1111-1111-111111111111', 4, 'لغة الجسد الواثقة',
   'جسدك يتحدث قبل لسانك. تعرّف على وضعيات الوقوف والجلوس، والتواصل البصري، والإيماءات التي تعزّز رسالتك بدل أن تُضعفها.',
   'text', 5, 4),
  ('11111111-1111-1111-1111-111111111111', 5, 'بناء العلاقات',
   'الكاريزما ليست عن نفسك، بل عن كيف تجعل الآخرين يشعرون. تعلّم مبادئ بناء علاقات صادقة ومتينة تدوم.',
   'text', 6, 5),
  ('11111111-1111-1111-1111-111111111111', 6, 'التعامل مع المواقف الصعبة',
   'الخلافات جزء من الحياة. اكتشف كيف تدير الحوارات الصعبة بهدوء، وتنزع فتيل التوتر، وتحافظ على احترامك واحترام الطرف الآخر.',
   'text', 7, 6),
  ('11111111-1111-1111-1111-111111111111', 7, 'حضورك الشخصي',
   'في الدرس الأخير نجمع كل ما تعلّمناه في هوية تواصلية متكاملة تعكس أفضل نسخة منك، وتترك أثراً إيجابياً أينما ذهبت.',
   'text', 6, 7)
on conflict (track_id, day_number) do nothing;

-- ============================================================================
-- Phase 14 — Second track: Self-Confidence (الثقة بالنفس)
-- Same ON CONFLICT guards; safe to re-run on an existing database.
-- ============================================================================

insert into public.tracks (id, slug, title_ar, title_en, description_ar, description_en, "order")
values (
  '22222222-2222-2222-2222-222222222222',
  'self-confidence',
  'الثقة بالنفس',
  'Self-Confidence',
  'مسار سبعة أيام لبناء ثقة راسخة بالنفس، خطوة عملية كل يوم.',
  'A seven-day track to build lasting self-confidence, one practical step a day.',
  1
)
on conflict (slug) do nothing;

insert into public.lessons (track_id, day_number, title_ar, body_ar, media_type, est_minutes, "order")
values
  ('22222222-2222-2222-2222-222222222222', 1, 'ما الثقة بالنفس حقاً؟',
   'الثقة ليست غياب الخوف، بل التصرف رغم وجوده. في هذا الدرس نفهم الفرق بين الثقة والغرور، ولماذا الثقة مهارة تُبنى بالتكرار لا صفة تولد معك. تمرين اليوم: اكتب ثلاثة مواقف تصرفت فيها بشجاعة رغم التوتر.',
   'text', 5, 1),
  ('22222222-2222-2222-2222-222222222222', 2, 'صوتك الداخلي',
   'الطريقة التي تحدّث بها نفسك تصنع ثقتك أو تهدمها. تعلّم أن تلاحظ جُمل النقد الذاتي القاسية وتستبدلها بلغة واقعية ورحيمة، كما لو كنت تنصح صديقاً عزيزاً. تمرين اليوم: سجّل ثلاث عبارات سلبية قلتها لنفسك وأعد صياغتها بإنصاف.',
   'text', 5, 2),
  ('22222222-2222-2222-2222-222222222222', 3, 'قوة الإنجازات الصغيرة',
   'الثقة تُبنى بالدليل لا بالتمني. كل وعد صغير تقطعه لنفسك وتفي به يضيف طوبة في جدار ثقتك. حدد هدفاً صغيراً جداً يمكن إنجازه اليوم — ثم أنجزه. المهم ليس حجم الهدف بل صدق الالتزام.',
   'text', 6, 3),
  ('22222222-2222-2222-2222-222222222222', 4, 'مواجهة الخوف بجرعات',
   'تجنّب ما يخيفك يريحك اليوم ويضعفك غداً. المنهج العملي: التعرض التدريجي — خطوات صغيرة خارج منطقة الراحة، تتسع مع الوقت. اختر موقفاً بسيطاً كنت تتجنبه (سؤال في اجتماع، مكالمة مؤجلة) وواجهه اليوم.',
   'text', 7, 4),
  ('22222222-2222-2222-2222-222222222222', 5, 'حدودك جزء من ثقتك',
   'قول "لا" باحترام مهارة أساسية للثقة بالنفس. من يوافق على كل شيء يفقد احترام نفسه قبل احترام الآخرين. تعلّم صيغاً مهذبة وواضحة لرفض ما لا يناسبك دون تبرير مفرط ولا قسوة.',
   'text', 6, 5),
  ('22222222-2222-2222-2222-222222222222', 6, 'التعامل مع الفشل',
   'الواثق ليس من لا يفشل، بل من يفشل ويتعلم ويكمل. أعد تعريف الفشل: معلومة عن طريقة لا تعمل، لا حكماً على قيمتك. تمرين اليوم: اكتب فشلاً قديماً وثلاثة أشياء تعلمتها منه.',
   'text', 6, 6),
  ('22222222-2222-2222-2222-222222222222', 7, 'ثقة تدوم',
   'في الختام نجمع الأدوات: حوار داخلي منصف، إنجازات صغيرة متراكمة، مواجهة تدريجية للمخاوف، وحدود واضحة. ضع خطة أسبوع واحد تطبّق فيها أداة واحدة يومياً — الثقة عادة تُمارس، لا شعور يُنتظر.',
   'text', 6, 7)
on conflict (track_id, day_number) do nothing;
