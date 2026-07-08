import {
  parseCsv,
  csvToRecords,
  containsArabic,
  isValidSlug,
  validateContent,
  BODY_MIN_LENGTH,
  BODY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type RawContentRow,
} from '../lib/contentValidation';
import {
  interestToTrackSlug,
  trackTitle,
  DEFAULT_TRACK_SLUG,
  CONFIDENCE_TRACK_SLUG,
} from '../lib/tracks';

const arabicBody = 'هذا نص تجريبي طويل بما يكفي ليكون درساً حقيقياً في التطبيق. '.repeat(2);

function row(overrides: Partial<RawContentRow> = {}): RawContentRow {
  return {
    track_slug: 'self-confidence',
    track_title_ar: 'الثقة بالنفس',
    day_number: '1',
    title_ar: 'درس تجريبي',
    body_ar: arabicBody,
    est_minutes: '5',
    ...overrides,
  };
}

describe('parseCsv', () => {
  it('parses simple rows and trims blank lines', () => {
    expect(parseCsv('a,b\nc,d\n\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles quoted fields with commas, escaped quotes, and newlines', () => {
    const csv = 'title,body\n"عنوان, بفاصلة","سطر أول\nسطر ثانٍ به ""اقتباس"""';
    expect(parseCsv(csv)).toEqual([
      ['title', 'body'],
      ['عنوان, بفاصلة', 'سطر أول\nسطر ثانٍ به "اقتباس"'],
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('csvToRecords', () => {
  it('maps header names to fields', () => {
    const recs = csvToRecords([
      ['track_slug', 'title_ar'],
      ['self-confidence', 'درس'],
    ]);
    expect(recs).toEqual([{ track_slug: 'self-confidence', title_ar: 'درس' }]);
  });
});

describe('containsArabic / isValidSlug', () => {
  it('detects Arabic script', () => {
    expect(containsArabic('مرحبا')).toBe(true);
    expect(containsArabic('hello only')).toBe(false);
  });

  it('accepts lowercase hyphenated slugs only', () => {
    expect(isValidSlug('self-confidence')).toBe(true);
    expect(isValidSlug('Self-Confidence')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('has space')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });
});

describe('validateContent', () => {
  it('accepts a well-formed multi-day track', () => {
    const result = validateContent([row(), row({ day_number: '2', title_ar: 'درس ثانٍ' })]);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.tracks).toHaveLength(1);
    expect(result.lessons).toHaveLength(2);
    expect(result.lessons[1].day_number).toBe(2);
  });

  it('rejects an empty file', () => {
    expect(validateContent([]).ok).toBe(false);
  });

  it('rejects bad slugs, missing track titles, and non-Arabic titles', () => {
    const result = validateContent([
      row({ track_slug: 'Bad Slug!', track_title_ar: '', title_ar: 'English title' }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/track_slug/);
    expect(result.errors.join('\n')).toMatch(/track_title_ar/);
    expect(result.errors.join('\n')).toMatch(/no Arabic/);
  });

  it('rejects duplicate days and non-contiguous days', () => {
    const dup = validateContent([row(), row({ title_ar: 'مكرر' })]);
    expect(dup.errors.join('\n')).toMatch(/duplicate day 1/);

    const gap = validateContent([row(), row({ day_number: '3', title_ar: 'قفزة' })]);
    expect(gap.errors.join('\n')).toMatch(/contiguous/);
  });

  it('enforces body and title length bounds', () => {
    const short = validateContent([row({ body_ar: 'قصير' })]);
    expect(short.errors.join('\n')).toMatch(new RegExp(`min ${BODY_MIN_LENGTH}`));

    const long = validateContent([row({ body_ar: 'م'.repeat(BODY_MAX_LENGTH + 1) })]);
    expect(long.errors.join('\n')).toMatch(new RegExp(`max ${BODY_MAX_LENGTH}`));

    const longTitle = validateContent([row({ title_ar: 'ع'.repeat(TITLE_MAX_LENGTH + 1) })]);
    expect(longTitle.errors.join('\n')).toMatch(new RegExp(`max ${TITLE_MAX_LENGTH}`));
  });

  it('rejects bad est_minutes and defaults blank to 5', () => {
    const bad = validateContent([row({ est_minutes: 'abc' })]);
    expect(bad.ok).toBe(false);

    const blank = validateContent([row({ est_minutes: '' })]);
    expect(blank.ok).toBe(true);
    expect(blank.lessons[0].est_minutes).toBe(5);
  });

  it('flags encoding mishaps (replacement character)', () => {
    const result = validateContent([row({ body_ar: arabicBody + '�' })]);
    expect(result.errors.join('\n')).toMatch(/UTF-8/);
  });
});

describe('trackTitle', () => {
  const track = { title_ar: 'الثقة بالنفس', title_en: 'Self-Confidence' };

  it('uses the English name in English (and ar-* stays Arabic)', () => {
    expect(trackTitle(track, 'en')).toBe('Self-Confidence');
    expect(trackTitle(track, 'en-US')).toBe('Self-Confidence');
    expect(trackTitle(track, 'ar')).toBe('الثقة بالنفس');
  });

  it('falls back to Arabic when there is no English name', () => {
    expect(trackTitle({ title_ar: 'مسار', title_en: null }, 'en')).toBe('مسار');
  });
});

describe('interestToTrackSlug', () => {
  it('maps onboarding interests to track slugs with a safe default', () => {
    expect(interestToTrackSlug('interestConfidence')).toBe(CONFIDENCE_TRACK_SLUG);
    expect(interestToTrackSlug('interestCommunication')).toBe(DEFAULT_TRACK_SLUG);
    expect(interestToTrackSlug('interestLeadership')).toBe(DEFAULT_TRACK_SLUG);
    expect(interestToTrackSlug(null)).toBe(DEFAULT_TRACK_SLUG);
    expect(interestToTrackSlug('unknown')).toBe(DEFAULT_TRACK_SLUG);
  });
});
