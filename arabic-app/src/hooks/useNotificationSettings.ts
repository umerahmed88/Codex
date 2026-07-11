// ============================================================================
// useNotificationSettings — remembers whether the daily reminder is on and at
// what time, and keeps the OS schedule in sync with those settings.
// Settings live in AsyncStorage (a device preference, not server data).
//
// Backed by a single module-level store (not per-component useState) so every
// caller — Profile and Onboarding — shares one copy and one load. With
// per-component state each caller loaded independently and could drift; callers
// should also wait on `isLoaded` before rendering the controls so the toggle
// never paints (or persists) a stale default.
// ============================================================================
import { useSyncExternalStore, useEffect, useCallback } from 'react';
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

type State = { settings: ReminderSettings; isLoaded: boolean };

let state: State = { settings: DEFAULT, isLoaded: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

let loadStarted = false;
function ensureLoaded() {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
    let loaded = DEFAULT;
    if (raw) {
      try {
        loaded = { ...DEFAULT, ...JSON.parse(raw) };
      } catch {
        // ignore corrupt value, keep defaults
      }
    }
    state = { settings: loaded, isLoaded: true };
    emit();
  });
}

export function useNotificationSettings() {
  useEffect(() => {
    ensureLoaded();
  }, []);

  const snapshot = useSyncExternalStore(subscribe, () => state);

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
    state = { settings: effective, isLoaded: true };
    emit();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(effective));
    return effective.enabled === next.enabled;
  }, []);

  return { settings: snapshot.settings, isLoaded: snapshot.isLoaded, update };
}
