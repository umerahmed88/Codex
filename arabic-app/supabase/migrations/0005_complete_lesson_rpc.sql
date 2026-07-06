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
