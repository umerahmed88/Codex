// ============================================================================
// In-app feedback — pure validation & shaping.
//
// A direct line from users to us post-launch (bug reports, feature asks,
// "the Arabic here is wrong"). The submit hook does the network write; this
// module owns the rules for what a valid submission is, so those rules are
// tested and shared with the UI (which uses them to enable/disable the button).
// ============================================================================

export type FeedbackCategory = 'bug' | 'idea' | 'content' | 'other';

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug', 'idea', 'content', 'other'];

// Guard rails: long enough to be useful, short enough to fit one DB row and
// deter abuse. Message is trimmed before both checks.
export const FEEDBACK_MIN_LENGTH = 4;
export const FEEDBACK_MAX_LENGTH = 2000;

export interface FeedbackDraft {
  category: FeedbackCategory;
  message: string;
}

export type FeedbackValidation = { ok: true } | { ok: false; reason: 'too_short' | 'too_long' };

// Is this draft submittable? The UI calls this to gate the send button and the
// hook calls it again before writing, so the rule lives in exactly one place.
export function validateFeedback(draft: FeedbackDraft): FeedbackValidation {
  const trimmed = draft.message.trim();
  if (trimmed.length < FEEDBACK_MIN_LENGTH) return { ok: false, reason: 'too_short' };
  if (trimmed.length > FEEDBACK_MAX_LENGTH) return { ok: false, reason: 'too_long' };
  return { ok: true };
}

// The row we actually persist. Message is trimmed; category is trusted (it's a
// closed enum chosen from the UI, never free text).
export interface FeedbackRow {
  category: FeedbackCategory;
  message: string;
  app_version: string;
  platform: string;
}

// Shape a validated draft + device context into the row to insert. Callers
// must have validated first; we trim defensively regardless.
export function toFeedbackRow(
  draft: FeedbackDraft,
  context: { appVersion: string; platform: string }
): FeedbackRow {
  return {
    category: draft.category,
    message: draft.message.trim(),
    app_version: context.appVersion,
    platform: context.platform,
  };
}
