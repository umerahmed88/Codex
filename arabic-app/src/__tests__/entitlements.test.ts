import {
  isLessonPremium,
  canAccessLesson,
  shouldShowPaywall,
  FREE_LESSON_LIMIT,
} from '../lib/entitlements';
import type { LessonWithProgress } from '../types/database';

function lesson(day: number, status: LessonWithProgress['status']): LessonWithProgress {
  return {
    id: `l${day}`,
    track_id: 't1',
    day_number: day,
    title_ar: `درس ${day}`,
    body_ar: 'نص',
    media_url: null,
    media_type: 'text',
    est_minutes: 5,
    order: day,
    created_at: '2026-01-01T00:00:00Z',
    status,
    completed_at: null,
  };
}

describe('isLessonPremium', () => {
  it('treats lessons past the free limit as premium', () => {
    expect(isLessonPremium(FREE_LESSON_LIMIT)).toBe(false);
    expect(isLessonPremium(FREE_LESSON_LIMIT + 1)).toBe(true);
  });
});

describe('canAccessLesson', () => {
  it('free lesson, available → accessible without subscription', () => {
    expect(canAccessLesson(lesson(1, 'available'), false)).toBe(true);
  });

  it('premium lesson, available, not subscribed → blocked', () => {
    expect(canAccessLesson(lesson(2, 'available'), false)).toBe(false);
  });

  it('premium lesson, available, subscribed → accessible', () => {
    expect(canAccessLesson(lesson(2, 'available'), true)).toBe(true);
  });

  it('locked lesson is never accessible, even for subscribers', () => {
    expect(canAccessLesson(lesson(2, 'locked'), true)).toBe(false);
  });
});

describe('shouldShowPaywall', () => {
  it('fires only when the paywall is what blocks an otherwise-unlocked premium lesson', () => {
    expect(shouldShowPaywall(lesson(2, 'available'), false)).toBe(true);
    expect(shouldShowPaywall(lesson(2, 'available'), true)).toBe(false); // subscribed
    expect(shouldShowPaywall(lesson(1, 'available'), false)).toBe(false); // free lesson
    expect(shouldShowPaywall(lesson(2, 'locked'), false)).toBe(false); // progress-locked, not paywalled
  });
});
