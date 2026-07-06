// ============================================================================
// Locale-aware number formatting (Phase 16 — a11y / polish).
//
// Arabic readers expect Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩), not Western
// (0123456789). The streak count, XP total, and level all render through here
// so they read naturally in Arabic while staying Western in English.
//
// Kept pure (locale passed in) so the digit mapping is unit-tested; a thin
// hook (useFormatNumber) reads the current i18n language for components.
// ============================================================================

// U+0660 ARABIC-INDIC DIGIT ZERO … U+0669 NINE, indexed by Western digit.
const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// Convert every ASCII digit in a string to Arabic-Indic. Non-digits (a
// thousands separator, a percent sign, a minus) pass through untouched.
export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}

// Format a number for display in the given locale. Only 'ar' gets Arabic-Indic
// digits; everything else stays Western. Thousands are grouped for readability.
export function formatNumber(value: number, locale: string | undefined): string {
  // Group thousands with a locale-appropriate separator, then localize digits.
  // We use 'en-US' grouping (comma) as the base and swap digits for Arabic so
  // the output doesn't depend on the JS engine's ICU locale data being present.
  const grouped = Math.trunc(value).toLocaleString('en-US');
  return locale?.startsWith('ar') ? toArabicDigits(grouped) : grouped;
}
