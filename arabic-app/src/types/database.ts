// ============================================================================
// TypeScript types mirroring the database schema (see supabase/migrations).
// Keeping these in sync with the SQL is what makes the app "typed end-to-end":
// if a column changes, the compiler tells us every place that must update.
// ============================================================================

export type SubscriptionStatus = 'free' | 'active' | 'expired';
export type LessonStatus = 'locked' | 'available' | 'completed';
export type MediaType = 'text' | 'audio' | 'video';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  locale: string;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export interface Track {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  order: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  track_id: string;
  day_number: number;
  title_ar: string;
  body_ar: string;
  media_url: string | null;
  media_type: MediaType;
  est_minutes: number;
  order: number;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: LessonStatus;
  completed_at: string | null;
  created_at: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface Xp {
  user_id: string;
  total_xp: number;
}

export interface CoachMessage {
  id: string;
  user_id: string;
  question: string;
  answer: string | null;
  cited_lesson_id: string | null;
  created_at: string;
}

// A lesson combined with the current user's progress on it — the shape the
// Learn/Today screens actually render.
export interface LessonWithProgress extends Lesson {
  status: LessonStatus;
  completed_at: string | null;
}
