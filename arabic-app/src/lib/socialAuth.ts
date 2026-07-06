// ============================================================================
// Social sign-in: Apple + Google → Supabase (Phase 15).
//
// Both flows end in supabase.auth.signInWithIdToken() — the provider proves
// the user's identity and hands us an ID token; Supabase verifies it and
// creates/returns the same kind of session as email+password. The rest of the
// app (AuthProvider, RLS, triggers) doesn't know or care how the user signed in.
//
// "Built now, configured later" (the user's decision): the login screen only
// renders these buttons when the platform + env config allows —
//   Apple : iOS device AND the capability is available
//   Google: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set
// Until then the buttons simply don't exist. Setup: docs/phase-15-growth.md.
// App Store rule: once Google sign-in ships on iOS, Apple sign-in is MANDATORY
// — enable both together.
// ============================================================================
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

// Google button: config-driven, both platforms.
export function isGoogleSignInAvailable(): boolean {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}

// Apple button: iOS only, and only when the device/build supports it.
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

// Both functions throw Error('cancelled') when the user backs out — callers
// should swallow that one (it's not a failure) and surface everything else.

export async function signInWithApple(): Promise<void> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      throw new Error('cancelled');
    }
    throw e;
  }
  if (!credential.identityToken) throw new Error('apple_no_token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  // Dynamic import: the Google native module doesn't exist in Expo Go — a
  // top-level import would crash the whole login screen even with the button
  // hidden. This way it only loads when actually tapped (in a dev/prod build).
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') throw new Error('cancelled');
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('google_no_token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
}
