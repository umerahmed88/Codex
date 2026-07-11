// ============================================================================
// Daily reminder notifications.
//
// Design principles from the plan: be RESPECTFUL. Ask for permission only when
// the user opts in, never nag, and if permission is denied, fail gracefully
// (return false) rather than crashing or blocking the app.
// ============================================================================
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from './i18n';

// A stable id so we only ever have ONE scheduled daily reminder (rescheduling
// replaces it rather than stacking duplicates).
const DAILY_REMINDER_ID = 'daily-lesson-reminder';

// Foreground behavior: show the reminder even if the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Ask for permission. Returns true if granted. Safe to call repeatedly — if
// already granted it resolves immediately without a second prompt.
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Schedule (or reschedule) the daily reminder at the given local hour/minute.
// Returns false if permission isn't granted — the caller decides how to react.
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  body: string
): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Clear any existing reminder first so we never stack duplicates.
  await cancelDailyReminder();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { title: i18n.t('notifications.title'), body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

// Turn the reminder off.
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // Nothing scheduled — that's fine.
  }
}
