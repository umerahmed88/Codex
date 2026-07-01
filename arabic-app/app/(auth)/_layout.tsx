import { Stack } from 'expo-router';

// The auth screens share a simple headerless stack. The AuthGate in the root
// layout decides when this group is shown (only when nobody is logged in).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
