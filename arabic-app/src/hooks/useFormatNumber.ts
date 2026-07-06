// ============================================================================
// useFormatNumber — components' entry point to locale-aware number formatting.
// Reads the current i18n language and delegates to the pure formatNumber
// (Phase 16). Re-renders on language change because useTranslation subscribes
// to i18next.
// ============================================================================
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../lib/formatNumber';

export function useFormatNumber(): (value: number) => string {
  const { i18n } = useTranslation();
  return (value: number) => formatNumber(value, i18n.language);
}
