// ============================================================================
// Hooks for reading the user's streak and XP rows.
// ============================================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Streak, Xp } from '../types/database';

export function useStreak(userId: string | undefined) {
  return useQuery<Streak | null>({
    queryKey: ['streak', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useXp(userId: string | undefined) {
  return useQuery<Xp | null>({
    queryKey: ['xp', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
