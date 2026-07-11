import { pluralForm, pluralKey } from '../lib/plural';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

// The keys rendered through useCountText — every one must define all six CLDR
// forms in BOTH locales so pluralKey() always resolves to a real string.
const COUNTED_KEYS = ['today.minutes', 'coach.remaining', 'gamify.nextMilestone', 'gamify.longest'];
const FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

const resolve = (obj: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);

describe('pluralForm — Arabic CLDR cardinal rules', () => {
  it.each([
    [0, 'zero'],
    [1, 'one'],
    [2, 'two'],
    [3, 'few'],
    [5, 'few'],
    [10, 'few'],
    [11, 'many'],
    [26, 'many'],
    [99, 'many'],
    [100, 'other'],
    [101, 'other'],
    [102, 'other'], // NOT "two": the two-form is exactly n=2
    [103, 'few'], // 103 % 100 = 3
    [111, 'many'], // 111 % 100 = 11
  ] as const)('ar: %i → %s', (n, form) => {
    expect(pluralForm(n, 'ar')).toBe(form);
  });

  it('English: 1 → one, everything else → other', () => {
    expect(pluralForm(1, 'en')).toBe('one');
    expect(pluralForm(0, 'en')).toBe('other');
    expect(pluralForm(2, 'en')).toBe('other');
    expect(pluralForm(5, 'en')).toBe('other');
  });

  it('handles negatives and fractions by magnitude', () => {
    expect(pluralForm(-2, 'ar')).toBe('two');
    expect(pluralForm(5.7, 'ar')).toBe('few');
  });
});

describe('counted keys define every plural form in both locales', () => {
  it.each(COUNTED_KEYS)('%s has all six forms in ar + en', (base) => {
    for (const form of FORMS) {
      expect(typeof resolve(ar, `${base}.${form}`)).toBe('string');
      expect(typeof resolve(en, `${base}.${form}`)).toBe('string');
    }
  });

  it('pluralKey resolves to a defined string for realistic counts', () => {
    for (const base of COUNTED_KEYS) {
      for (const n of [0, 1, 2, 3, 7, 15, 30, 100]) {
        expect(typeof resolve(ar, pluralKey(base, n, 'ar'))).toBe('string');
        expect(typeof resolve(en, pluralKey(base, n, 'en'))).toBe('string');
      }
    }
  });

  it('Arabic few-form actually differs from the singular (real pluralization)', () => {
    // Guards against someone flattening the forms back to one string.
    expect(resolve(ar, 'today.minutes.few')).not.toEqual(resolve(ar, 'today.minutes.one'));
  });
});
