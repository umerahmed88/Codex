import '../src/lib/i18n'; // must be first
import { initSentry } from '../src/lib/sentry';
import { useEffect } from 'react';
import { I18nManager, View } from 'react-native';
// Importing GestureHandlerRootView also loads the gesture-handler module
// (its side effects) — no separate bare import needed.
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AuthProvider, useAuth } from '../src/lib/AuthProvider';
import { SubscriptionProvider } from '../src/lib/SubscriptionProvider';
import { useOnboarding } from '../src/hooks/useOnboarding';
import { UpdateGate } from '../src/components/UpdateGate';
import { StatusBar } from 'expo-status-bar';

// Force RTL globally before any layout is computed
I18nManager.forceRTL(true);

// Initialize Sentry as early as possible
initSentry();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      // gcTime must be ≥ the persister maxAge for cached content to survive a
      // cold start (Phase 16 offline reading).
      gcTime: 1000 * 60 * 60 * 24, // 24h
    },
  },
});

// Persist the React Query cache to AsyncStorage so already-loaded lessons open
// offline / on a cold start. We ONLY persist content (tracks + lessons), never
// user-state queries (progress, streak, xp, coach counts) — those must always
// reflect the server, and server-authority (Phase 11) makes stale local copies
// pointless. Content is safe to show from disk while a fresh copy loads.
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'rq-content-cache',
});

const PERSISTED_QUERY_KEYS = ['tracks', 'lessons'];


// The "gate": redirects between the auth screens and the main app based on
// whether a session exists. This is what makes login actually protect the app.
function AuthGate() {
  const { session, isLoading } = useAuth();
  const { isComplete: onboarded, isLoading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || onboardingLoading) return; // wait until both states are known

    const inOnboarding = segments[0] === '(onboarding)';
    const inAuthGroup = segments[0] === '(auth)';

    if (!onboarded && !inOnboarding) {
      // First run on this device → show onboarding before anything else.
      router.replace('/(onboarding)');
    } else if (onboarded && !session && !inAuthGroup) {
      // Onboarded but not logged in → send to login.
      router.replace('/(auth)/login');
    } else if (onboarded && session && (inAuthGroup || inOnboarding)) {
      // Logged in but sitting on auth/onboarding → send into the app.
      router.replace('/(tabs)');
    }
  }, [session, isLoading, onboarded, onboardingLoading, segments, router]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <UpdateGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
        </Stack>
      </UpdateGate>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo: require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: 1000 * 60 * 60 * 24, // 24h — matches gcTime above
            dehydrateOptions: {
              shouldDehydrateQuery: (query) =>
                PERSISTED_QUERY_KEYS.includes(query.queryKey[0] as string),
            },
          }}
        >
          <AuthProvider>
            <SubscriptionProvider>
              <StatusBar style="light" />
              <AuthGate />
            </SubscriptionProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
