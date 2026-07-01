// ============================================================================
// Client hooks for the AI Coach.
// The app never talks to Claude directly — it invokes the `coach` Edge
// Function, which holds the API key and does retrieval + grounding server-side.
// ============================================================================
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CoachAnswer } from '../lib/coach';

// Ask the coach a question. Returns the grounded answer + citation.
export function useAskCoach() {
  return useMutation<CoachAnswer, Error, string>({
    mutationFn: async (question: string) => {
      const { data, error } = await supabase.functions.invoke('coach', {
        body: { question },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error === 'rate_limited') {
        throw new Error('rate_limited');
      }
      return data as CoachAnswer;
    },
  });
}

// How many coach questions the user has asked today (for the free-tier counter).
export function useCoachQuestionsToday(userId: string | undefined) {
  return useQuery<number>({
    queryKey: ['coach-count', userId],
    enabled: !!userId,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .gte('created_at', startOfDay.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
}
