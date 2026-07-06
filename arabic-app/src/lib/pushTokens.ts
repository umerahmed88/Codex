// ============================================================================
// Expo push token registration (Phase 15 — remote push).
//
// Local scheduled reminders (src/lib/notifications.ts) don't need a server.
// REMOTE push (win-back campaigns, announcements) does: the server must know
// each device's Expo push token. This module registers the token — but only
// when notification permission is ALREADY granted; it never prompts. The
// permission ask stays where it belongs, in the reminder opt-in flow.
// ============================================================================
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Register (or refresh) this device's push token for the signed-in user.
// Fire-and-forget by design: push is an optimization, never a blocker, so
// every failure path returns false instead of throwing.
export async function registerPushToken(userId: string): Promise<boolean> {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false; // web: no Expo push

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false; // respect: no permission, no token

    // The EAS project id is required to mint a push token; in Expo Go /
    // unconfigured dev builds it may be absent — skip quietly.
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return false;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase.from('push_tokens').upsert(
      {
        token,
        user_id: userId,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
    return !error;
  } catch {
    return false;
  }
}

// Remove this device's token on logout so the previous user stops receiving
// pushes on a device that's no longer theirs.
export async function unregisterPushToken(): Promise<void> {
  try {
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // Best-effort; an orphaned token just gets pruned by Expo receipts later.
  }
}
