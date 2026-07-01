// ============================================================================
// useOfflineSync — flushes queued lesson completions when the app becomes
// active (a proxy for "likely back online"). Each queued item is replayed
// through the same completeLessonWrites path; on success it leaves the queue.
//
// Using AppState (built into RN) avoids adding a NetInfo dependency; a failed
// replay simply stays queued for the next foreground.
// ============================================================================
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { readQueue, removeFromQueue } from '../lib/offlineQueue';
import { completeLessonWrites } from '../lib/completeLesson';
import type { Lesson } from '../types/database';

export function useOfflineSync(userId: string | undefined) {
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const flush = async () => {
      if (isSyncing.current) return; // avoid overlapping flushes
      isSyncing.current = true;
      try {
        const queue = await readQueue(AsyncStorage);
        if (queue.length === 0) return;

        // Fetch lessons once so we can resolve each queued lessonId + unlock next.
        const { data: lessons } = await supabase.from('lessons').select('*');
        const allLessons = (lessons ?? []) as Lesson[];

        for (const item of queue) {
          const lesson = allLessons.find((l) => l.id === item.lessonId);
          if (!lesson) {
            // Unknown lesson (deleted?) — drop it to avoid a stuck queue.
            await removeFromQueue(AsyncStorage, item.lessonId);
            continue;
          }
          try {
            const trackLessons = allLessons.filter((l) => l.track_id === lesson.track_id);
            await completeLessonWrites({
              userId,
              lesson,
              trackLessons,
              completedDay: item.completedDay,
            });
            await removeFromQueue(AsyncStorage, item.lessonId);
          } catch {
            // Still failing (offline) — keep it queued and stop; retry next time.
            break;
          }
        }

        queryClient.invalidateQueries({ queryKey: ['progress', userId] });
        queryClient.invalidateQueries({ queryKey: ['streak', userId] });
        queryClient.invalidateQueries({ queryKey: ['xp', userId] });
      } finally {
        isSyncing.current = false;
      }
    };

    // Flush once now, and again whenever the app returns to the foreground.
    flush();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') flush();
    });
    return () => sub.remove();
  }, [userId, queryClient]);
}
