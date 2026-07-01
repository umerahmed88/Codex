import '../src/lib/i18n'; // must be first
import { initSentry } from '../src/lib/sentry';
import { useEffect } from 'react';
import { I18nManager, View } from 'react-native';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AuthProvider, useAuth } from '../src/lib/AuthProvider';
import { SubscriptionProvider } from '../src/lib/SubscriptionProvider';
import { useOnboarding } from '../src/hooks/useOnboarding';
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
    },
  },
});

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SubscriptionProvider>
            <StatusBar style="light" />
            <AuthGate />
          </SubscriptionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
