// ============================================================================
// Data hook for reading the current user's lesson progress.
//
// Progress WRITES no longer happen from the client at all: RLS makes
// lesson_progress read-only (migration 0005), and the only way to earn
// progress/XP/streaks is the server-side complete_lesson RPC — see
// src/lib/completeLesson.ts.
// ============================================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { LessonProgress } from '../types/database';

// Read all progress rows for the logged-in user.
export function useProgress(userId: string | undefined) {
  return useQuery<LessonProgress[]>({
    queryKey: ['progress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}
