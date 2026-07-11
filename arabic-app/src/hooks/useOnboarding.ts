// ============================================================================
// Tracks whether this device has finished first-run onboarding. Device-level
// (AsyncStorage), not per-user — onboarding runs once per install, before sign-up.
//
// Backed by a single module-level store (not per-component useState) so that
// EVERY caller stays in sync: the onboarding screen and the AuthGate both call
// this hook, and when the screen calls complete() the gate must see the change
// immediately to route the user onward. With per-component state the gate never
// heard the update and left the user stuck on the last onboarding slide.
// ============================================================================
import { useSyncExternalStore, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding:complete';

type State = { isComplete: boolean; isLoading: boolean };

let state: State = { isComplete: false, isLoading: true };
const listeners = new Set<() => void>();

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Read the persisted flag exactly once for the whole app.
let loadStarted = false;
function ensureLoaded() {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(KEY).then((v) => {
    setState({ isComplete: v === 'true', isLoading: false });
  });
}

export function useOnboarding() {
  useEffect(() => {
    ensureLoaded();
  }, []);

  const snapshot = useSyncExternalStore(subscribe, () => state);

  const complete = useCallback(async () => {
    await AsyncStorage.setItem(KEY, 'true');
    setState({ isComplete: true });
  }, []);

  return { isComplete: snapshot.isComplete, isLoading: snapshot.isLoading, complete };
}
