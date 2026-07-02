import {
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  toFeedbackRow,
  validateFeedback,
} from '../lib/feedback';

describe('validateFeedback', () => {
  it('rejects a too-short (or whitespace-only) message', () => {
    expect(validateFeedback({ category: 'bug', message: '  ' })).toEqual({
      ok: false,
      reason: 'too_short',
    });
    expect(validateFeedback({ category: 'bug', message: 'ab' }).ok).toBe(false);
  });

  it('rejects a too-long message', () => {
    const long = 'x'.repeat(FEEDBACK_MAX_LENGTH + 1);
    expect(validateFeedback({ category: 'idea', message: long })).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });

  it('accepts a message inside the bounds', () => {
    expect(validateFeedback({ category: 'content', message: 'x'.repeat(FEEDBACK_MIN_LENGTH) }).ok).toBe(
      true
    );
    expect(validateFeedback({ category: 'other', message: 'This lesson is great' }).ok).toBe(true);
  });
});

describe('toFeedbackRow', () => {
  it('trims the message and carries device context', () => {
    const row = toFeedbackRow(
      { category: 'bug', message: '  crash on open  ' },
      { appVersion: '1.0.0', platform: 'ios' }
    );
    expect(row).toEqual({
      category: 'bug',
      message: 'crash on open',
      app_version: '1.0.0',
      platform: 'ios',
    });
  });
});
