import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Platform, Linking, ScrollView } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n, { setLocale } from '../../src/lib/i18n';
import { useAuth } from '../../src/lib/AuthProvider';
import { useSubscription } from '../../src/lib/SubscriptionProvider';
import { useStreak, useXp } from '../../src/hooks/useStreakXp';
import { useNotificationSettings } from '../../src/hooks/useNotificationSettings';
import { useFeatureFlag } from '../../src/hooks/useAppConfig';
import { useFormatNumber } from '../../src/hooks/useFormatNumber';
import { unregisterPushToken } from '../../src/lib/pushTokens';
import { StreakBadge } from '../../src/components/StreakBadge';
import { LevelProgress } from '../../src/components/LevelProgress';
import { isStreakActive, toDayString } from '../../src/lib/streak';
import { colors, spacing, typography, radius } from '../../src/theme';

// TODO: replace with your real hosted legal pages before store submission.
const PRIVACY_URL = 'https://example.com/privacy';
const TERMS_URL = 'https://example.com/terms';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut, session } = useAuth();
  const { isSubscribed } = useSubscription();
  const userId = session?.user.id;

  const { data: streak } = useStreak(userId);
  const { data: xp } = useXp(userId);
  const { settings, update } = useNotificationSettings();
  const feedbackEnabled = useFeatureFlag('feedback');
  const fmt = useFormatNumber();

  // "Manage subscription" deep-links to the store's subscription settings.
  const manageSubscription = () => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url);
  };

  const [showPicker, setShowPicker] = useState(false);
  const [denied, setDenied] = useState(false);

  const today = toDayString(new Date());
  const streakState = streak ?? { current_streak: 0, longest_streak: 0, last_active_date: null };
  const active = isStreakActive(streakState, today);

  const toggleLocale = () => {
    // setLocale persists the choice so it survives app restarts (Phase 12).
    void setLocale(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const onToggleReminder = async (value: boolean) => {
    const ok = await update({ ...settings, enabled: value });
    setDenied(value && !ok);
  };

  const onTimeChange = async (_event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(Platform.OS === 'ios'); // iOS picker stays open; Android closes
    if (date) {
      await update({ ...settings, enabled: settings.enabled, hour: date.getHours(), minute: date.getMinutes() });
    }
  };

  const timeLabel = `${String(settings.hour).padStart(2, '0')}:${String(settings.minute).padStart(2, '0')}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      {/* Streak + level */}
      <View style={styles.card}>
        <View style={styles.streakRow}>
          <StreakBadge count={streakState.current_streak} active={active} />
          <Text style={styles.longest}>{t('gamify.longest', { count: fmt(streakState.longest_streak) })}</Text>
        </View>
        <LevelProgress totalXp={xp?.total_xp ?? 0} />
      </View>

      {/* Subscription */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.manageSubscription')}</Text>
        {isSubscribed ? (
          <View style={styles.settingRow}>
            <Text style={styles.subscribed}>{t('profile.subscribed')}</Text>
            <Pressable onPress={manageSubscription} accessibilityRole="link">
              <Text style={styles.link}>{t('profile.manageSubscription')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.upgradeButton} onPress={() => router.push('/paywall')}>
            <Text style={styles.upgradeText}>{t('profile.upgrade')}</Text>
          </Pressable>
        )}
      </View>

      {/* Daily reminder */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.reminderTitle')}</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('profile.reminderEnabled')}</Text>
          <Switch value={settings.enabled} onValueChange={onToggleReminder} />
        </View>
        {settings.enabled && (
          <Pressable style={styles.settingRow} onPress={() => setShowPicker(true)}>
            <Text style={styles.settingLabel}>{t('profile.reminderTime')}</Text>
            <Text style={styles.timeValue}>{timeLabel}</Text>
          </Pressable>
        )}
        {denied && <Text style={styles.denied}>{t('profile.reminderDenied')}</Text>}
        {showPicker && (
          <DateTimePicker
            mode="time"
            value={new Date(2026, 0, 1, settings.hour, settings.minute)}
            onChange={onTimeChange}
          />
        )}
      </View>

      {feedbackEnabled && (
        <Pressable
          style={styles.langButton}
          onPress={() => router.push('/feedback')}
          accessibilityRole="button"
        >
          <Text style={styles.langButtonText}>{t('feedback.open')}</Text>
        </Pressable>
      )}

      <Pressable style={styles.langButton} onPress={toggleLocale}>
        <Text style={styles.langButtonText}>
          {i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.logoutButton}
        onPress={async () => {
          // Deregister push first — after signOut, RLS blocks the delete.
          await unregisterPushToken();
          await signOut();
        }}
      >
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </Pressable>

      {/* Legal links — required for store approval */}
      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
          <Text style={styles.legalLink}>{t('profile.privacyPolicy')}</Text>
        </Pressable>
        <Text style={styles.legalDot}>•</Text>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
          <Text style={styles.legalLink}>{t('profile.terms')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  streakRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  longest: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  settingLabel: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  timeValue: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.primary,
  },
  denied: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.warning,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  langButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  langButtonText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
  logoutButton: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.error,
  },
  subscribed: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.success,
  },
  link: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.primaryLight,
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  upgradeText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.primaryDark,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  legalLink: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  legalDot: { color: colors.textMuted },
});
