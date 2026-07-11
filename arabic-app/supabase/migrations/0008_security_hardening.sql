-- ============================================================================
-- 0008 — Security & correctness hardening (post-audit)
-- ============================================================================
-- Three fixes from the code/security review:
--   1. Lock subscription_status so a client can't self-grant premium.
--   2. complete_lesson: reject locked lessons (no XP farming) + fix the streak
--      math for offline replays and non-UTC timezones.
--   3. (Constant-time webhook secret compares live in the Edge Functions.)
-- Safe to run on an existing database — create-or-replace only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. subscription_status is server-authoritative (webhook / service-role only)
-- ----------------------------------------------------------------------------
-- The users UPDATE policy allowed updating ANY column, so a logged-in client
-- could run update({ subscription_status: 'active' }) and become premium. We
-- can't easily express "all columns except one" in an RLS WITH CHECK, so a
-- trigger reverts any client-side change to subscription_status. The RevenueCat
-- webhook uses the service role (auth.role() = 'service_role'), which is exempt.
create or replace function public.guard_subscription_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role'
     and new.subscription_status is distinct from old.subscription_status then
    -- Silently keep the old value rather than raise: the client's best-effort
    -- sync call must not throw, and only the webhook is allowed to change it.
    new.subscription_status := old.subscription_status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_subscription_status on public.users;
create trigger trg_guard_subscription_status
  before update on public.users
  for each row execute function public.guard_subscription_status();

-- ----------------------------------------------------------------------------
-- 2. complete_lesson v2 — unlock check + corrected streak state machine
-- ----------------------------------------------------------------------------
create or replace function public.complete_lesson(
  p_lesson_id uuid,
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
  v_prog_status text;
  v_streak      record;
  v_new_current integer;
  v_new_longest integer;
  v_new_xp      integer;
  v_diff        integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Clamp the credited day. Allow up to tomorrow (current_date + 1) so users in
  -- timezones AHEAD of UTC (the whole Arabic market) can credit their real local
  -- day when it's still "yesterday" in UTC — while still blocking far-future
  -- tampering.
  v_day := least(coalesce(p_completed_day, current_date), current_date + 1);

  select id, track_id, day_number into v_lesson
  from public.lessons where id = p_lesson_id;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  select status into v_prog_status
  from public.lesson_progress
  where user_id = v_user_id and lesson_id = p_lesson_id;

  -- Idempotency: re-completing an already-done lesson never re-awards.
  if v_prog_status = 'completed' then
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

  -- Prerequisite / anti-forgery: the lesson must actually be unlocked for this
  -- user. Day 1 of a track is always available (no progress row yet); any later
  -- day is playable only once the previous day marked it 'available'. Without
  -- this, a client could complete every lesson id and farm XP / skip the path.
  if v_prog_status is distinct from 'available'
     and not (v_prog_status is null and v_lesson.day_number = 1) then
    raise exception 'lesson is locked' using errcode = 'P0001';
  end if;

  -- 1. Mark completed.
  insert into public.lesson_progress (user_id, lesson_id, status, completed_at)
  values (v_user_id, p_lesson_id, 'completed', now())
  on conflict (user_id, lesson_id)
  do update set status = 'completed', completed_at = now();

  -- 2. Award XP atomically.
  update public.xp set total_xp = total_xp + 10
  where user_id = v_user_id
  returning total_xp into v_new_xp;
  if not found then
    insert into public.xp (user_id, total_xp) values (v_user_id, 10)
    returning total_xp into v_new_xp;
  end if;

  -- 3. Advance the streak. Fixes vs v1:
  --    * v_diff < 0 (an OLDER offline replay arriving after a newer day) is now
  --      a no-op instead of resetting the streak to 1.
  --    * last_active_date never moves backwards (greatest()).
  select current_streak, longest_streak, last_active_date into v_streak
  from public.streaks where user_id = v_user_id for update;
  if not found then
    insert into public.streaks (user_id, current_streak, longest_streak, last_active_date)
    values (v_user_id, 1, 1, v_day);
    v_new_current := 1;
    v_new_longest := 1;
  else
    if v_streak.last_active_date is null then
      v_new_current := 1;
    else
      v_diff := v_day - v_streak.last_active_date;
      if v_diff = 0 then
        v_new_current := v_streak.current_streak;          -- same day
      elsif v_diff = 1 then
        v_new_current := v_streak.current_streak + 1;      -- consecutive day
      elsif v_diff < 0 then
        v_new_current := v_streak.current_streak;          -- late offline replay
      else
        v_new_current := 1;                                -- missed >= 1 day
      end if;
    end if;
    v_new_longest := greatest(coalesce(v_streak.longest_streak, 0), v_new_current);

    update public.streaks
    set current_streak = v_new_current,
        longest_streak = v_new_longest,
        last_active_date = greatest(coalesce(v_streak.last_active_date, v_day), v_day)
    where user_id = v_user_id;
  end if;

  -- 4. Unlock the next day's lesson (never downgrade a completed one).
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
    'last_active_date', greatest(coalesce(v_streak.last_active_date, v_day), v_day)
  );
end;
$$;

grant execute on function public.complete_lesson(uuid, date) to authenticated;
