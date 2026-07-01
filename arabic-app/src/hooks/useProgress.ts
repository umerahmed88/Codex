// ============================================================================
// Data hooks for reading and writing the current user's lesson progress.
//
// Writing uses a "mutation" — React Query's tool for changes. After a write we
// invalidate the cached progress so the UI refreshes with the new state.
// The full streak/XP logic lands in Phase 3; here we cover the read + a basic
// "mark available/completed" write so auth and progress can be tested now.
// ============================================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { LessonProgress, LessonStatus } from '../types/database';

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

interface SetProgressArgs {
  userId: string;
  lessonId: string;
  status: LessonStatus;
}

// Insert-or-update a single lesson's status for the user.
export function useSetProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, lessonId, status }: SetProgressArgs) => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,lesson_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as LessonProgress;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progress', variables.userId] });
    },
  });
}
