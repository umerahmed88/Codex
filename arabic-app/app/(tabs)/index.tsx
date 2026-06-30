import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sentry } from '../../src/lib/sentry';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';

export default function TodayScreen() {
  const { t } = useTranslation();

  const handleTestCrash = () => {
    // Hidden debug button to verify Sentry integration
    Sentry.captureException(new Error('Test crash from debug button'));
    throw new Error('Deliberate test crash — verify in Sentry dashboard');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{t('today.greeting')}</Text>
      <Text style={styles.title}>{t('today.title')}</Text>

      {/* Placeholder lesson card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>فن التواصل الفعّال</Text>
        <Text style={styles.cardMeta}>٥ دقائق</Text>
        <Pressable style={styles.startButton}>
          <Text style={styles.startButtonText}>{t('today.start')}</Text>
        </Pressable>
      </View>

      {/* Debug crash button — hidden in production */}
      {__DEV__ && (
        <Pressable style={styles.debugButton} onPress={handleTestCrash}>
          <Text style={styles.debugText}>{t('debug.testCrash')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    // RTL flow handled by I18nManager.forceRTL at the app level
  },
  greeting: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
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
    ...shadows.md,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  cardMeta: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  startButtonText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
  debugButton: {
    marginTop: spacing.xxl,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  debugText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.error,
  },
});
