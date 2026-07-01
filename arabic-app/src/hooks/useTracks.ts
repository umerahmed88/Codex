// ============================================================================
// Data hooks for reading content (tracks + lessons).
//
// These wrap React Query, which gives us loading/error/caching for free. Each
// hook returns { data, isLoading, isError } so screens can render every state
// explicitly — a "never breaks" requirement.
// ============================================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Track, Lesson } from '../types/database';

// Fetch all tracks, ordered.
export function useTracks() {
  return useQuery<Track[]>({
    queryKey: ['tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Fetch all lessons in a track, ordered by day.
export function useLessons(trackId: string | undefined) {
  return useQuery<Lesson[]>({
    queryKey: ['lessons', trackId],
    enabled: !!trackId, // don't run until we have a trackId
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('track_id', trackId!)
        .order('order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
