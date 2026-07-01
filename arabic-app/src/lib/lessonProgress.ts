// ============================================================================
// Pure helpers for combining lessons with a user's progress.
// "Pure" means: same input → same output, no network, no side effects. That
// makes this logic trivial to unit-test, which is why the screens delegate to
// it instead of doing the merge inline.
// ============================================================================
import type { Lesson, LessonProgress, LessonWithProgress, LessonStatus } from '../types/database';

// Combine the track's lessons with the user's progress rows. Lessons the user
// has never touched default to 'locked', except day 1 which is 'available' so
// a brand-new user can always start.
export function mergeLessonsWithProgress(
  lessons: Lesson[],
  progress: LessonProgress[]
): LessonWithProgress[] {
  const byLessonId = new Map<string, LessonProgress>();
  for (const p of progress) byLessonId.set(p.lesson_id, p);

  return lessons.map((lesson) => {
    const existing = byLessonId.get(lesson.id);
    const status: LessonStatus =
      existing?.status ?? (lesson.day_number === 1 ? 'available' : 'locked');
    return {
      ...lesson,
      status,
      completed_at: existing?.completed_at ?? null,
    };
  });
}

// Find the single lesson the user should see on the Today screen: the first
// 'available' lesson, or (if all available ones are done) the first
// not-yet-completed lesson. Returns null if everything is completed.
export function selectTodaysLesson(lessons: LessonWithProgress[]): LessonWithProgress | null {
  const available = lessons.find((l) => l.status === 'available');
  if (available) return available;
  const firstIncomplete = lessons.find((l) => l.status !== 'completed');
  return firstIncomplete ?? null;
}
