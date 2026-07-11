// ============================================================================
// useTrackData — composes tracks + lessons + progress into the merged shape the
// Today and Learn screens render. Centralizing this here means both screens
// show identical lock/available/completed state with no duplicated logic.
// ============================================================================
import { useMemo } from 'react';
import { useTracks, useLessons } from './useTracks';
import { useProgress } from './useProgress';
import { useSelectedTrack } from './useSelectedTrack';
import { mergeLessonsWithProgress } from '../lib/lessonProgress';
import type { LessonWithProgress, Track } from '../types/database';

interface TrackData {
  track: Track | undefined;
  tracks: Track[]; // all tracks, for the Learn screen's switcher
  lessons: LessonWithProgress[];
  rawLessons: ReturnType<typeof useLessons>['data'];
  isLoading: boolean;
  isError: boolean;
  // Re-fires whichever of the three queries failed (error screens' retry
  // button). Refetching everything is harmless — React Query dedupes fresh data.
  refetch: () => void;
}

export function useTrackData(userId: string | undefined): TrackData {
  const tracksQuery = useTracks();
  const selectedSlug = useSelectedTrack((s) => s.slug);

  // The user's selected track (Phase 14), falling back to the first track
  // when nothing is selected yet or the stored slug no longer exists.
  const tracks = useMemo(() => tracksQuery.data ?? [], [tracksQuery.data]);
  const track = useMemo(
    () => tracks.find((t) => t.slug === selectedSlug) ?? tracks[0],
    [tracks, selectedSlug]
  );

  const lessonsQuery = useLessons(track?.id);
  const progressQuery = useProgress(userId);

  const lessons = useMemo(
    () => mergeLessonsWithProgress(lessonsQuery.data ?? [], progressQuery.data ?? []),
    [lessonsQuery.data, progressQuery.data]
  );

  return {
    track,
    tracks,
    lessons,
    rawLessons: lessonsQuery.data,
    isLoading: tracksQuery.isLoading || lessonsQuery.isLoading || progressQuery.isLoading,
    isError: tracksQuery.isError || lessonsQuery.isError || progressQuery.isError,
    refetch: () => {
      void tracksQuery.refetch();
      void lessonsQuery.refetch();
      void progressQuery.refetch();
    },
  };
}
