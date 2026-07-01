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
