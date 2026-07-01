// ============================================================================
// useCompleteLesson — the "Mark complete" mutation.
//
// Delegates the actual writes to completeLessonWrites (shared with offline
// sync). If the write chain fails (e.g. offline), we enqueue the completion so
// it syncs later — the user is never blocked mid-lesson.
// ============================================================================
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeLessonWrites } from '../lib/completeLesson';
import { toDayString } from '../lib/streak';
import { enqueueCompletion } from '../lib/offlineQueue';
import type { Lesson } from '../types/database';

interface CompleteArgs {
  userId: string;
  lesson: Lesson;
  trackLessons: Lesson[];
  // Accepted for call-site compatibility; the write path re-reads fresh values.
  streak?: unknown;
  totalXp?: number | null;
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, lesson, trackLessons }: CompleteArgs) => {
      const completedDay = toDayString(new Date());
      return completeLessonWrites({ userId, lesson, trackLessons, completedDay });
    },

    onError: async (_err, variables) => {
      // Offline (or transient failure): remember it so it syncs on reconnect.
      await enqueueCompletion(AsyncStorage, {
        lessonId: variables.lesson.id,
        completedDay: toDayString(new Date()),
        enqueuedAt: new Date().toISOString(),
      });
    },

    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['streak', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['xp', variables.userId] });
    },
  });
}
