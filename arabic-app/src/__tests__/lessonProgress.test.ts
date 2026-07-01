import { mergeLessonsWithProgress, selectTodaysLesson } from '../lib/lessonProgress';
import type { Lesson, LessonProgress } from '../types/database';

// Minimal lesson factory so tests stay readable.
function lesson(id: string, day: number): Lesson {
  return {
    id,
    track_id: 't1',
    day_number: day,
    title_ar: `درس ${day}`,
    body_ar: 'نص',
    media_url: null,
    media_type: 'text',
    est_minutes: 5,
    order: day,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function progress(lessonId: string, status: LessonProgress['status']): LessonProgress {
  return {
    id: `p-${lessonId}`,
    user_id: 'u1',
    lesson_id: lessonId,
    status,
    completed_at: status === 'completed' ? '2026-01-02T00:00:00Z' : null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('mergeLessonsWithProgress', () => {
  const lessons = [lesson('l1', 1), lesson('l2', 2), lesson('l3', 3)];

  it('defaults day 1 to available and later days to locked when no progress', () => {
    const merged = mergeLessonsWithProgress(lessons, []);
    expect(merged[0].status).toBe('available');
    expect(merged[1].status).toBe('locked');
    expect(merged[2].status).toBe('locked');
  });

  it('applies stored progress status over the defaults', () => {
    const merged = mergeLessonsWithProgress(lessons, [
      progress('l1', 'completed'),
      progress('l2', 'available'),
    ]);
    expect(merged[0].status).toBe('completed');
    expect(merged[0].completed_at).not.toBeNull();
    expect(merged[1].status).toBe('available');
    expect(merged[2].status).toBe('locked');
  });
});

describe('selectTodaysLesson', () => {
  const lessons = [lesson('l1', 1), lesson('l2', 2), lesson('l3', 3)];

  it('returns the first available lesson', () => {
    const merged = mergeLessonsWithProgress(lessons, [progress('l1', 'completed'), progress('l2', 'available')]);
    expect(selectTodaysLesson(merged)?.id).toBe('l2');
  });

  it('returns the first available for a brand-new user (day 1)', () => {
    const merged = mergeLessonsWithProgress(lessons, []);
    expect(selectTodaysLesson(merged)?.id).toBe('l1');
  });

  it('returns null when every lesson is completed', () => {
    const merged = mergeLessonsWithProgress(lessons, [
      progress('l1', 'completed'),
      progress('l2', 'completed'),
      progress('l3', 'completed'),
    ]);
    expect(selectTodaysLesson(merged)).toBeNull();
  });
});
