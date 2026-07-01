import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/AuthProvider';
import { useSubscription } from '../../src/lib/SubscriptionProvider';
import { useTrackData } from '../../src/hooks/useTrackData';
import { shouldShowPaywall } from '../../src/lib/entitlements';
import type { LessonWithProgress } from '../../src/types/database';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function LearnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const { isSubscribed } = useSubscription();
  const { lessons, isLoading, isError } = useTrackData(session?.user.id);

  const openLesson = (lesson: LessonWithProgress) => {
    if (shouldShowPaywall(lesson, isSubscribed)) {
      router.push('/paywall');
    } else {
      router.push(`/lesson/${lesson.id}`);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.error}>{t('learn.error')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('learn.title')}</Text>
      <FlatList
        data={lessons}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={<Text style={styles.empty}>{t('learn.empty')}</Text>}
        renderItem={({ item }) => <LessonRow lesson={item} onPress={() => openLesson(item)} />}
      />
    </View>
  );
}

function LessonRow({ lesson, onPress }: { lesson: LessonWithProgress; onPress: () => void }) {
  const { t } = useTranslation();
  const locked = lesson.status === 'locked';

  const badge =
    lesson.status === 'completed'
      ? { label: t('learn.completed'), color: colors.success, icon: '✓' }
      : lesson.status === 'available'
        ? { label: t('learn.available'), color: colors.primary, icon: '●' }
        : { label: t('learn.locked'), color: colors.textMuted, icon: '🔒' };

  return (
    <Pressable
      style={[styles.row, locked && styles.rowLocked]}
      onPress={locked ? undefined : onPress}
      disabled={locked}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, locked && styles.textLocked]}>{lesson.title_ar}</Text>
        <Text style={styles.rowDay}>{`اليوم ${lesson.day_number}`}</Text>
      </View>
      <Text style={[styles.badge, { color: badge.color }]}>
        {badge.icon} {badge.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.error,
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  empty: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textMuted,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLocked: { opacity: 0.55 },
  rowMain: { flex: 1 },
  rowTitle: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  textLocked: { color: colors.textMuted },
  rowDay: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  badge: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    marginStart: spacing.md,
  },
});
