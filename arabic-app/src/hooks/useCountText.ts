// ============================================================================
// useCountText — render a counted phrase in the current language with the
// correct plural form AND localized digits, e.g.:
//
//   const count = useCountText();
//   count('today.minutes', 5)   // ar → "٥ دقائق"   en → "5 min"
//
// The locale files define zero/one/two/few/many/other under each counted key;
// selection happens in src/lib/plural.ts (pure, engine-independent — see the
// rationale there), and the number itself is interpolated as {{num}} through
// formatNumber so Arabic shows Arabic-Indic digits.
// ============================================================================
import { useTranslation } from 'react-i18next';
import { pluralKey } from '../lib/plural';
import { useFormatNumber } from './useFormatNumber';

export function useCountText(): (base: string, n: number) => string {
  const { t, i18n } = useTranslation();
  const fmt = useFormatNumber();
  return (base: string, n: number) => t(pluralKey(base, n, i18n.language), { num: fmt(n) });
}
