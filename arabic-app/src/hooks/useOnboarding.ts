// ============================================================================
// Tracks whether this device has finished first-run onboarding. Device-level
// (AsyncStorage), not per-user — onboarding runs once per install, before sign-up.
// ============================================================================
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding:complete';

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      setIsComplete(v === 'true');
      setIsLoading(false);
    });
  }, []);

  const complete = useCallback(async () => {
    await AsyncStorage.setItem(KEY, 'true');
    setIsComplete(true);
  }, []);

  return { isComplete, isLoading, complete };
}
