import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/AuthProvider';
import { useSubscription } from '../../src/lib/SubscriptionProvider';
import { useFeatureFlag } from '../../src/hooks/useAppConfig';
import { useTrackData } from '../../src/hooks/useTrackData';
import { useSelectedTrack } from '../../src/hooks/useSelectedTrack';
import { useFormatNumber } from '../../src/hooks/useFormatNumber';
import { trackTitle } from '../../src/lib/tracks';
import { shouldShowPaywall } from '../../src/lib/entitlements';
import { isPurchasesConfigured } from '../../src/lib/purchases';
import { fxPop } from '../../src/lib/fx';
import { Lumi } from '../../src/components/Lumi';
import { PressableScale } from '../../src/components/PressableScale';
import type { LessonWithProgress, Track } from '../../src/types/database';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function LearnScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const { isSubscribed } = useSubscription();
  const paywallActive = useFeatureFlag('paywall') && isPurchasesConfigured();
  const { track, tracks, lessons, isLoading, isError } = useTrackData(session?.user.id);
  const selectTrack = useSelectedTrack((s) => s.select);

  const openLesson = (lesson: LessonWithProgress) => {
    fxPop();
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

  // The "current" node is the first playable (available) lesson.
  const currentId = lessons.find((l) => l.status === 'available')?.id;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('learn.title')}</Text>

      {tracks.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.trackScroller}
          contentContainerStyle={styles.trackChips}
        >
          {tracks.map((tr: Track) => {
            const selected = tr.id === track?.id;
            return (
              <PressableScale
                key={tr.id}
                onPress={() => selectTrack(tr.slug)}
                style={[styles.trackChip, selected && styles.trackChipSel]}
                accessibilityLabel={trackTitle(tr, i18n.language)}
              >
                <Text style={[styles.trackChipText, selected && styles.trackChipTextSel]}>
                  {trackTitle(tr, i18n.language)}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={styles.path}>
        {lessons.length === 0 && <Text style={styles.empty}>{t('learn.empty')}</Text>}
        {lessons.map((lesson, i) => (
          <PathNode
            key={lesson.id}
            lesson={lesson}
            index={i}
            isCurrent={lesson.id === currentId}
            isLast={i === lessons.length - 1}
            onPress={() => openLesson(lesson)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function PathNode({
  lesson,
  index,
  isCurrent,
  isLast,
  onPress,
}: {
  lesson: LessonWithProgress;
  index: number;
  isCurrent: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormatNumber();
  const reduced = useReducedMotion();
  const done = lesson.status === 'completed';
  const locked = lesson.status === 'locked';
  // Gentle left-right weave (deterministic, symmetric so RTL is unaffected).
  const offset = Math.round(Math.sin(index * 0.85) * 46);

  // Announce the lesson state to screen readers (color/icon alone isn't enough).
  const stateLabel = done
    ? t('learn.completed')
    : isCurrent
      ? t('learn.here')
      : locked
        ? t('learn.locked')
        : t('learn.available');
  const nodeLabel = `${t('learn.day', { day: fmt(lesson.day_number) })} — ${stateLabel}`;

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(Math.min(index * 60, 480)).duration(360)}
      style={styles.pathRow}
    >
      <View style={[styles.nodeSlot, { transform: [{ translateX: offset }] }]}>
        {isCurrent && (
          // Keep Lumi on the inner side of the node so a node pushed toward the
          // screen edge by `offset` doesn't clip the mascot off-screen.
          <View
            style={[styles.lumiBeside, offset > 0 ? styles.lumiLeft : styles.lumiRight]}
            pointerEvents="none"
          >
            <Lumi state="idle" size={52} />
          </View>
        )}
        {isCurrent && <PulseRing />}
        <PressableScale
          disabled={locked}
          haptic={false}
          onPress={onPress}
          style={[
            styles.node,
            done && styles.nodeDone,
            isCurrent && styles.nodeCurrent,
            locked && styles.nodeLocked,
          ]}
          accessibilityLabel={nodeLabel}
        >
          <Text style={[styles.nodeLabel, isCurrent && styles.nodeLabelCurrent, locked && styles.nodeLabelLocked]}>
            {done ? '✓' : locked ? '🔒' : fmt(lesson.day_number)}
          </Text>
        </PressableScale>
        {isCurrent && (
          <View style={styles.hereTag}>
            <Text style={styles.hereText}>{t('learn.here')}</Text>
          </View>
        )}
      </View>
      {!isLast && <View style={styles.connector} />}
    </Animated.View>
  );
}

function PulseRing() {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    scale.value = withRepeat(withTiming(1.7, { duration: 1600 }), -1, false);
    return () => cancelAnimation(scale);
  }, [reduced, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.55 * (1 - (scale.value - 1) / 0.7),
  }));
  return <Animated.View pointerEvents="none" style={[styles.pulseRing, style]} />;
}

const NODE = 62;
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
    marginBottom: spacing.md,
  },
  empty: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  trackScroller: { flexGrow: 0, marginBottom: spacing.sm },
  trackChips: { flexDirection: 'row-reverse', gap: spacing.sm, paddingVertical: spacing.xs },
  trackChip: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    minHeight: 44, // accessible touch target
    justifyContent: 'center',
  },
  trackChipSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  trackChipText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  trackChipTextSel: { color: colors.textInverse },
  path: { alignItems: 'center', paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  pathRow: { alignItems: 'center' },
  nodeSlot: { alignItems: 'center', justifyContent: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 5,
    borderBottomColor: colors.border,
  },
  nodeDone: { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark },
  nodeCurrent: { backgroundColor: colors.accent, borderBottomColor: '#CF8D15' },
  nodeLocked: { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.border },
  nodeLabel: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.lg,
    color: colors.textInverse,
  },
  nodeLabelCurrent: { color: colors.primaryDark },
  nodeLabelLocked: { fontSize: typography.size.md, color: colors.textMuted },
  pulseRing: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  lumiBeside: { position: 'absolute', bottom: -4 },
  lumiRight: { right: -58 },
  lumiLeft: { left: -58 },
  hereTag: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.mint,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  hereText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xs,
    color: colors.primaryDark,
  },
  connector: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
