import '../src/lib/i18n'; // must be first
import { initSentry } from '../src/lib/sentry';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
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
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
