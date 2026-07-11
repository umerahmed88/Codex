import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/lib/AuthProvider';
import { useSubscription } from '../../src/lib/SubscriptionProvider';
import { useFeatureFlag } from '../../src/hooks/useAppConfig';
import { useTrackData } from '../../src/hooks/useTrackData';
import { useStreak, useXp } from '../../src/hooks/useStreakXp';
import { useCompleteLesson } from '../../src/hooks/useCompleteLesson';
import { shouldShowPaywall } from '../../src/lib/entitlements';
import { isPurchasesConfigured } from '../../src/lib/purchases';
import { milestoneForCompletion, type Milestone } from '../../src/lib/milestones';
import { useFormatNumber } from '../../src/hooks/useFormatNumber';
import { Button } from '../../src/components/Button';
import { CelebrationOverlay } from '../../src/components/CelebrationOverlay';
import { colors, spacing, typography } from '../../src/theme';

export default function LessonPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const fmt = useFormatNumber();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { isSubscribed } = useSubscription();
  const paywallActive = useFeatureFlag('paywall') && isPurchasesConfigured();
  const { lessons, rawLessons, isLoading, isError } = useTrackData(userId);
  const { data: streak } = useStreak(userId);
  const { data: xp } = useXp(userId);
  const complete = useCompleteLesson();
  const [celebration, setCelebration] = useState<{
    xp: number;
    streak: number;
    milestone: Milestone | null;
  } | null>(null);

  const merged = lessons.find((l) => l.id === id);
  const raw = rawLessons?.find((l) => l.id === id);

  // Deep-link guard: if this lesson is premium and the user isn't subscribed,
  // send them to the paywall instead of showing the content.
  useEffect(() => {
    if (merged && paywallActive && shouldShowPaywall(merged, isSubscribed)) {
      router.replace('/paywall');
    }
  }, [merged, isSubscribed, paywallActive, router]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !merged || !raw) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.error}>{t('today.errorLoading')}</Text>
      </View>
    );
  }

  const isCompleted = merged.status === 'completed';

  const handleComplete = () => {
    if (!userId || !rawLessons) return;
    // Capture the streak BEFORE completing so we can tell whether this
    // completion actually advanced it (invalidation only refetches in onSettled,
    // which runs after onSuccess — but capturing here is unambiguous).
    const prevStreak = streak?.current_streak ?? 0;
    complete.mutate(
      {
        userId,
        lesson: raw,
        streak: streak
          ? {
              current_streak: streak.current_streak,
              longest_streak: streak.longest_streak,
              last_active_date: streak.last_active_date,
            }
          : null,
        totalXp: xp?.total_xp ?? null,
        trackLessons: rawLessons,
      },
      {
        onSuccess: (data) => {
          const newStreak = data.nextStreak.current_streak;
          // Fire a milestone ONLY when this completion advanced the streak to a
          // threshold — never on a same-day repeat or an already-completed lesson
          // (see milestoneForCompletion).
          const milestone = milestoneForCompletion(prevStreak, newStreak, data.alreadyCompleted);
          setCelebration({
            xp: data.alreadyCompleted ? 0 : 10,
            streak: newStreak,
            milestone,
          });
        },
      }
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: merged.title_ar,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textInverse,
          headerTitleStyle: { fontFamily: typography.fontFamily.arabicBold },
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.lessonTitle}>{merged.title_ar}</Text>
          <Text style={styles.meta}>{t('today.minutes', { count: fmt(merged.est_minutes) })}</Text>

          {/* Media placeholder — a real audio/video player lands with real media. */}
          {merged.media_type !== 'text' && merged.media_url && (
            <View style={styles.mediaBox}>
              <Text style={styles.mediaLabel}>🎧 {merged.media_type}</Text>
            </View>
          )}

          <Text style={styles.body}>{merged.body_ar}</Text>
        </ScrollView>

        <View style={styles.footer}>
          {complete.isError && <Text style={styles.offlineNote}>{t('lesson.savedOffline')}</Text>}
          <Button
            title={isCompleted ? t('lesson.completed') : t('lesson.markComplete')}
            onPress={handleComplete}
            loading={complete.isPending}
            disabled={isCompleted}
          />
        </View>
      </View>

      <CelebrationOverlay
        visible={!!celebration}
        xpGained={celebration?.xp ?? 0}
        streak={celebration?.streak ?? 0}
        milestone={celebration?.milestone ?? null}
        onDismiss={() => {
          setCelebration(null);
          router.back();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg },
  error: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.error,
    textAlign: 'center',
  },
  lessonTitle: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  meta: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  mediaBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  mediaLabel: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  body: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    textAlign: 'right',
    // Generous line-height is essential for comfortable Arabic reading.
    lineHeight: typography.size.lg * typography.lineHeight.relaxed,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  offlineNote: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
