import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useAuth } from '../../src/lib/AuthProvider';
import { useOfflineSync } from '../../src/hooks/useOfflineSync';
import { registerPushToken } from '../../src/lib/pushTokens';
import { colors, typography } from '../../src/theme';

export default function TabLayout() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user.id;

  // Flush any offline-queued lesson completions once the user is in the app.
  useOfflineSync(userId);

  // Register this device for remote push (Phase 15). No-op unless the user
  // already granted notification permission via the reminder opt-in.
  useEffect(() => {
    if (userId) void registerPushToken(userId);
  }, [userId]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.arabic,
          fontSize: typography.size.xs,
        },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textInverse,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.arabicBold,
          fontSize: typography.size.lg,
        },
        // RTL: flip icon positions and ensure labels render right-to-left
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t('tabs.coach'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      scale.value = focused ? 1.15 : 1;
      return;
    }
    scale.value = withSpring(focused ? 1.22 : 1, { damping: 9, stiffness: 320 });
  }, [focused, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[{ fontSize: 22 }, style]}>{emoji}</Animated.Text>;
}
