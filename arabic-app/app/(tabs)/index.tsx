import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/AuthProvider';
import { useSubscription } from '../../src/lib/SubscriptionProvider';
import { useFeatureFlag } from '../../src/hooks/useAppConfig';
import { useTrackData } from '../../src/hooks/useTrackData';
import { useStreak, useXp } from '../../src/hooks/useStreakXp';
import { selectTodaysLesson } from '../../src/lib/lessonProgress';
import { shouldShowPaywall } from '../../src/lib/entitlements';
import { isPurchasesConfigured } from '../../src/lib/purchases';
import { isStreakActive, toDayString } from '../../src/lib/streak';
import { levelProgress } from '../../src/lib/xp';
import { useFormatNumber } from '../../src/hooks/useFormatNumber';
import { StreakBadge } from '../../src/components/StreakBadge';
import { Lumi } from '../../src/components/Lumi';
import { PressableScale } from '../../src/components/PressableScale';
import { AnimatedCounter } from '../../src/components/AnimatedCounter';
import type { LessonWithProgress } from '../../src/types/database';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';

export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const fmt = useFormatNumber();
  const reduced = useReducedMotion();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { isSubscribed } = useSubscription();
  const paywallActive = useFeatureFlag('paywall') && isPurchasesConfigured();
  const { lessons, isLoading, isError } = useTrackData(userId);
  const { data: streak } = useStreak(userId);
  const { data: xp } = useXp(userId);

  const openLesson = (lesson: LessonWithProgress) => {
    if (paywallActive && shouldShowPaywall(lesson, isSubscribed)) {
      router.push('/paywall');
    } else {
      router.push(`/lesson/${lesson.id}`);
    }
  };

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
  const streakState = streak ?? { current_streak: 0, longest_streak: 0, last_active_date: null };
  const active = isStreakActive(streakState, toDayString(new Date()));
  const totalXp = xp?.total_xp ?? 0;
  const lvl = levelProgress(totalXp);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('today.title')}</Text>
        {streakState.current_streak > 0 && (
          <StreakBadge count={streakState.current_streak} active={active} />
        )}
      </View>

      {todaysLesson ? (
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(500)} style={styles.hero}>
          <View style={styles.heroBlob} />
          <View style={styles.heroTop}>
            <Lumi state="wave" size={92} />
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{t('today.greeting')} ✨</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{todaysLesson.title_ar}</Text>
          <Text style={styles.heroMeta}>{t('today.minutes', { count: fmt(todaysLesson.est_minutes) })}</Text>
          <PressableScale style={styles.cta} onPress={() => openLesson(todaysLesson)}>
            <Text style={styles.ctaText}>{t('today.start')}</Text>
          </PressableScale>
        </Animated.View>
      ) : (
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(500)} style={[styles.hero, styles.heroDone]}>
          <Lumi state="celebrate" size={104} />
          <Text style={styles.doneText}>{t('today.allDone')}</Text>
          {nextLocked && (
            <>
              <Text style={styles.previewLabel}>{t('today.tomorrowPreview')}</Text>
              <Text style={styles.previewTitle}>{nextLocked.title_ar}</Text>
            </>
          )}
        </Animated.View>
      )}

      {/* XP / level card */}
      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(200).duration(500)}
        style={styles.xpCard}
      >
        <View style={styles.xpTop}>
          <Text style={styles.level}>{t('gamify.level', { level: fmt(lvl.level) })}</Text>
          <View style={styles.xpNums}>
            <AnimatedCounter value={totalXp} style={styles.xpValue} />
            <Text style={styles.xpOf}>{` / ${fmt(lvl.nextLevelXp)}`}</Text>
          </View>
        </View>
        <View
          style={styles.xpBar}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: lvl.nextLevelXp, now: totalXp }}
          accessibilityLabel={t('gamify.level', { level: fmt(lvl.level) })}
        >
          <View style={[styles.xpFill, { width: `${Math.round(Math.max(0, Math.min(1, lvl.progress)) * 100)}%` }]} />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroBlob: {
    position: 'absolute',
    top: -40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primaryLight,
    opacity: 0.5,
  },
  heroDone: { alignItems: 'center', gap: spacing.sm },
  heroTop: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: spacing.md },
  bubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    padding: spacing.md,
  },
  bubbleText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.sm,
    color: colors.textInverse,
    textAlign: 'right',
  },
  heroTitle: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xl,
    color: colors.textInverse,
    textAlign: 'right',
    marginTop: spacing.lg,
  },
  heroMeta: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderBottomWidth: 4,
    borderBottomColor: '#CF8D15',
  },
  ctaText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.primaryDark,
  },
  doneText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.lg,
    color: colors.textInverse,
    textAlign: 'center',
  },
  previewLabel: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  previewTitle: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
    textAlign: 'center',
  },
  xpCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  xpTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  level: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.secondary,
  },
  xpNums: { flexDirection: 'row-reverse', alignItems: 'baseline' },
  xpValue: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.gold,
  },
  xpOf: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  xpBar: {
    height: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.gold,
  },
});
