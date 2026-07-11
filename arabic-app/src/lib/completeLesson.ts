// ============================================================================
// Lesson completion — now a single server-side RPC (Phase 11).
//
// The client used to compute XP/streaks and write them directly; a tampered
// client could write any values, and the read-then-write XP increment raced.
// complete_lesson() (supabase/migrations/0005) now does the whole sequence
// atomically on the server, with the same streak rules as lib/streak.ts.
// This wrapper keeps the old function's shape so useCompleteLesson and the
// offline replay in useOfflineSync stay unchanged.
// ============================================================================
import { supabase } from './supabase';
import type { StreakState } from './streak';
import type { Lesson } from '../types/database';

export interface CompleteWritesArgs {
  userId: string; // derived server-side from the session; kept for call-site compatibility
  lesson: Lesson;
  trackLessons: Lesson[]; // unlock is now resolved server-side; kept for compatibility
  // The calendar day the completion should credit (captured at action time so a
  // delayed offline sync still credits the correct day).
  completedDay: string;
}

interface CompleteLessonResult {
  already_completed: boolean;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export async function completeLessonWrites({
  lesson,
  completedDay,
}: CompleteWritesArgs): Promise<{
  nextStreak: StreakState;
  newXp: number;
  alreadyCompleted: boolean;
}> {
  const { data, error } = await supabase.rpc('complete_lesson', {
    p_lesson_id: lesson.id,
    p_completed_day: completedDay,
  });
  if (error) throw error;

  const result = data as unknown as CompleteLessonResult;
  return {
    nextStreak: {
      current_streak: result.current_streak,
      longest_streak: result.longest_streak,
      last_active_date: result.last_active_date,
    },
    newXp: result.total_xp,
    alreadyCompleted: result.already_completed,
  };
}
