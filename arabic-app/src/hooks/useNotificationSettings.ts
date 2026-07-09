// ============================================================================
// useNotificationSettings — remembers whether the daily reminder is on and at
// what time, and keeps the OS schedule in sync with those settings.
// Settings live in AsyncStorage (a device preference, not server data).
// ============================================================================
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../lib/i18n';
import { scheduleDailyReminder, cancelDailyReminder } from '../lib/notifications';

const STORAGE_KEY = 'settings:daily-reminder';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

export function useNotificationSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT, ...JSON.parse(raw) });
        } catch {
          // ignore corrupt value, keep defaults
        }
      }
      setIsLoaded(true);
    });
  }, []);

  // Apply a new setting: persist it AND reconcile the OS schedule.
  // Returns false if the user tried to enable but denied permission.
  const update = useCallback(async (next: ReminderSettings): Promise<boolean> => {
    let effective = next;
    if (next.enabled) {
      // Localized at schedule time; if the user changes language, toggling the
      // reminder reschedules it in the new language.
      const ok = await scheduleDailyReminder(next.hour, next.minute, i18n.t('notifications.reminderBody'));
      if (!ok) {
        // Permission denied — don't pretend it's on.
        effective = { ...next, enabled: false };
      }
    } else {
      await cancelDailyReminder();
    }
    setSettings(effective);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(effective));
    return effective.enabled === next.enabled;
  }, []);

  return { settings, isLoaded, update };
}
