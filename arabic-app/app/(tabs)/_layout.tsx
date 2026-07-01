import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useAuth } from '../../src/lib/AuthProvider';
import { useOfflineSync } from '../../src/hooks/useOfflineSync';
import { colors, typography } from '../../src/theme';

export default function TabLayout() {
  const { t } = useTranslation();
  const { session } = useAuth();

  // Flush any offline-queued lesson completions once the user is in the app.
  useOfflineSync(session?.user.id);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
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
          tabBarIcon: () => <TabIcon emoji="📅" />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: () => <TabIcon emoji="📚" />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t('tabs.coach'),
          tabBarIcon: () => <TabIcon emoji="🤖" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: () => <TabIcon emoji="👤" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}
