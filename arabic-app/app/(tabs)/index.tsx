import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/AuthProvider';
import { useTrackData } from '../../src/hooks/useTrackData';
import { useStreak } from '../../src/hooks/useStreakXp';
import { selectTodaysLesson } from '../../src/lib/lessonProgress';
import { isStreakActive, toDayString } from '../../src/lib/streak';
import { StreakBadge } from '../../src/components/StreakBadge';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';

export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { lessons, isLoading, isError } = useTrackData(userId);
  const { data: streak } = useStreak(userId);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>{t('today.loading')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.error}>{t('today.errorLoading')}</Text>
      </View>
    );
  }

  const todaysLesson = selectTodaysLesson(lessons);
  const nextLocked = lessons.find((l) => l.status === 'locked');

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.greeting}>{t('today.greeting')}</Text>
        {streak && streak.current_streak > 0 && (
          <StreakBadge
            count={streak.current_streak}
            active={isStreakActive(streak, toDayString(new Date()))}
          />
        )}
      </View>
      <Text style={styles.title}>{t('today.title')}</Text>

      {todaysLesson ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{todaysLesson.title_ar}</Text>
          <Text style={styles.cardMeta}>{t('today.minutes', { count: todaysLesson.est_minutes })}</Text>
          <Pressable
            style={styles.startButton}
            onPress={() => router.push(`/lesson/${todaysLesson.id}`)}
          >
            <Text style={styles.startButtonText}>{t('today.start')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.doneText}>{t('today.allDone')}</Text>
          {nextLocked && (
            <>
              <Text style={styles.previewLabel}>{t('today.tomorrowPreview')}</Text>
              <Text style={styles.previewTitle}>{nextLocked.title_ar}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  muted: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.error,
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  greeting: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'right',
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
  doneText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.success,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  previewLabel: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'right',
  },
  previewTitle: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
});
