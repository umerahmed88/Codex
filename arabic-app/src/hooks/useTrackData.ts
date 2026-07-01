// ============================================================================
// useTrackData — composes tracks + lessons + progress into the merged shape the
// Today and Learn screens render. Centralizing this here means both screens
// show identical lock/available/completed state with no duplicated logic.
// ============================================================================
import { useMemo } from 'react';
import { useTracks, useLessons } from './useTracks';
import { useProgress } from './useProgress';
import { mergeLessonsWithProgress } from '../lib/lessonProgress';
import type { LessonWithProgress, Track } from '../types/database';

interface TrackData {
  track: Track | undefined;
  lessons: LessonWithProgress[];
  rawLessons: ReturnType<typeof useLessons>['data'];
  isLoading: boolean;
  isError: boolean;
}

export function useTrackData(userId: string | undefined): TrackData {
  const tracksQuery = useTracks();
  const track = tracksQuery.data?.[0]; // the primary/first track for the MVP
  const lessonsQuery = useLessons(track?.id);
  const progressQuery = useProgress(userId);

  const lessons = useMemo(
    () => mergeLessonsWithProgress(lessonsQuery.data ?? [], progressQuery.data ?? []),
    [lessonsQuery.data, progressQuery.data]
  );

  return {
    track,
    lessons,
    rawLessons: lessonsQuery.data,
    isLoading: tracksQuery.isLoading || lessonsQuery.isLoading || progressQuery.isLoading,
    isError: tracksQuery.isError || lessonsQuery.isError || progressQuery.isError,
  };
}
