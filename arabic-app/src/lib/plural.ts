// ============================================================================
// Plural-form selection — pure and engine-independent.
//
// Arabic has SIX grammatical plural categories (CLDR: zero/one/two/few/many/
// other), and getting them wrong reads as broken Arabic ("٥ دقيقة" instead of
// "٥ دقائق"). i18next 24+ resolves plural suffixes through Intl.PluralRules,
// which Hermes (React Native's JS engine) does not reliably ship — and worse,
// jest/node DOES ship it, so tests would pass while devices silently fall back
// to the wrong form. We therefore select the form ourselves with the CLDR
// cardinal rules and address full key paths ("today.minutes.few") so nothing
// depends on the runtime's ICU data.
// ============================================================================

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

// CLDR cardinal plural rules.
//   Arabic:  0→zero · 1→one · 2→two · n%100∈3..10→few · n%100∈11..99→many
//            · else→other (e.g. 100, 101, 102)
//   English (and fallback): 1→one · else→other
export function pluralForm(n: number, locale: string | undefined): PluralForm {
  const abs = Math.abs(Math.trunc(n));
  if (locale?.startsWith('ar')) {
    if (abs === 0) return 'zero';
    if (abs === 1) return 'one';
    if (abs === 2) return 'two';
    const mod = abs % 100;
    if (mod >= 3 && mod <= 10) return 'few';
    if (mod >= 11 && mod <= 99) return 'many';
    return 'other';
  }
  return abs === 1 ? 'one' : 'other';
}

// Full i18n key for a counted phrase, e.g. pluralKey('today.minutes', 5, 'ar')
// → 'today.minutes.few'. The locale files define every form for every counted
// key in BOTH languages (the parity test enforces it), so the key always
// resolves.
export function pluralKey(base: string, n: number, locale: string | undefined): string {
  return `${base}.${pluralForm(n, locale)}`;
}
