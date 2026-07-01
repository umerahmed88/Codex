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
