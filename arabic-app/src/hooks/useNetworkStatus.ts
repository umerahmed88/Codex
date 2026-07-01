// ============================================================================
// Tracks online/offline so the app can show a clear "no internet" state
// instead of silent failures. Defaults to online until told otherwise.
// ============================================================================
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while unknown — treat null as online
      // to avoid a false "offline" flash on startup.
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsub;
  }, []);

  return { isOnline };
}
