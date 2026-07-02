/* eslint-disable import/no-named-as-default-member --
   i18next's documented API is the default export's fluent methods
   (i18n.use/.init/.changeLanguage); the named-export overlap is by design. */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

const LOCALE_STORAGE_KEY = 'settings:locale';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  // Synchronous default so the first frame renders Arabic with no flash;
  // the stored preference (if different) is applied right below.
  lng: 'ar',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Restore the user's saved language on boot (Phase 12 — the toggle used to
// reset to Arabic on every restart because the choice was never persisted).
AsyncStorage.getItem(LOCALE_STORAGE_KEY)
  .then((saved) => {
    if (saved && saved !== i18n.language) {
      return i18n.changeLanguage(saved);
    }
  })
  .catch(() => {
    // Storage unavailable — keep the default; not worth surfacing.
  });

// The one way to change language: applies it AND persists it.
export async function setLocale(locale: 'ar' | 'en'): Promise<void> {
  await i18n.changeLanguage(locale);
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Persisting failed (storage full/unavailable) — the session still switches.
  }
}

export default i18n;
