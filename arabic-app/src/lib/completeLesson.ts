// ============================================================================
// The completion write sequence, extracted so BOTH the live mutation
// (useCompleteLesson) and the offline flush (useOfflineSync) run identical
// logic. Single source of truth for "what completing a lesson does".
// ============================================================================
import { supabase } from './supabase';
import { advanceStreak, type StreakState } from './streak';
import { XP_PER_LESSON } from './xp';
import type { Lesson } from '../types/database';

export interface CompleteWritesArgs {
  userId: string;
  lesson: Lesson;
  trackLessons: Lesson[];
  // The calendar day the completion should credit (captured at action time so a
  // delayed offline sync still credits the correct day).
  completedDay: string;
}

// Runs the four completion writes. Throws on the first failure so callers can
// enqueue for retry. Reads current XP/streak fresh from the server to stay
// correct even when replaying a queued action later.
export async function completeLessonWrites({
  userId,
  lesson,
  trackLessons,
  completedDay,
}: CompleteWritesArgs): Promise<{ nextStreak: StreakState; newXp: number }> {
  // 1. Mark completed.
  const { error: progressError } = await supabase.from('lesson_progress').upsert(
    { user_id: userId, lesson_id: lesson.id, status: 'completed', completed_at: new Date().toISOString() },
    { onConflict: 'user_id,lesson_id' }
  );
  if (progressError) throw progressError;

  // 2. Award XP.
  const { data: xpRow } = await supabase.from('xp').select('total_xp').eq('user_id', userId).maybeSingle();
  const newXp = (xpRow?.total_xp ?? 0) + XP_PER_LESSON;
  const { error: xpError } = await supabase.from('xp').update({ total_xp: newXp }).eq('user_id', userId);
  if (xpError) throw xpError;

  // 3. Advance streak (credit the captured completion day).
  const { data: streakRow } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_active_date')
    .eq('user_id', userId)
    .maybeSingle();
  const current: StreakState = streakRow ?? { current_streak: 0, longest_streak: 0, last_active_date: null };
  const nextStreak = advanceStreak(current, completedDay);
  const { error: streakError } = await supabase
    .from('streaks')
    .update({
      current_streak: nextStreak.current_streak,
      longest_streak: nextStreak.longest_streak,
      last_active_date: nextStreak.last_active_date,
    })
    .eq('user_id', userId);
  if (streakError) throw streakError;

  // 4. Unlock next lesson.
  const next = trackLessons.find((l) => l.day_number === lesson.day_number + 1);
  if (next) {
    const { error: unlockError } = await supabase.from('lesson_progress').upsert(
      { user_id: userId, lesson_id: next.id, status: 'available' },
      { onConflict: 'user_id,lesson_id' }
    );
    if (unlockError) throw unlockError;
  }

  return { nextStreak, newXp };
}
