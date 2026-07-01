// ============================================================================
// The Supabase client — the single object the whole app uses to talk to the
// backend (login, database reads/writes).
//
// Session persistence: we store the login session in Expo SecureStore (the
// device's encrypted keychain) so the user stays logged in after closing the
// app, WITHOUT keeping the token in plain, readable storage.
// ============================================================================
import 'react-native-url-polyfill/auto'; // Supabase needs URL/fetch polyfills in RN
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// An adapter so Supabase can read/write its session through SecureStore.
// SecureStore is unavailable on web, so we fall back to localStorage there.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in development so a missing .env is obvious immediately.
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in your Supabase project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN has no URL bar; only relevant on web OAuth
  },
});
