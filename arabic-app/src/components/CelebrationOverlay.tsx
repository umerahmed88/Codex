// ============================================================================
// CelebrationOverlay — the reward moment shown after completing a lesson:
// confetti + Lumi cheering + the XP earned + current streak, plus a haptic and
// a chime. If the completion also hit a streak milestone, the milestone title
// leads and a bigger fanfare plays. Reduce-motion is honored (Confetti no-ops).
// ============================================================================
import { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Milestone } from '../lib/milestones';
import { Lumi } from './Lumi';
import { Confetti } from './Confetti';
import { PressableScale } from './PressableScale';
import { useFormatNumber } from '../hooks/useFormatNumber';
import { fxLessonComplete, fxLevelUp } from '../lib/fx';
import { colors, spacing, typography, radius } from '../theme';

interface Props {
  visible: boolean;
  xpGained: number;
  streak: number;
  milestone: Milestone | null;
  onDismiss: () => void;
}

export function CelebrationOverlay({ visible, xpGained, streak, milestone, onDismiss }: Props) {
  const { t } = useTranslation();
  const fmt = useFormatNumber();

  useEffect(() => {
    if (!visible) return;
    // Bigger fanfare for a milestone, a warm success chime otherwise.
    if (milestone) fxLevelUp();
    else fxLessonComplete();
  }, [visible, milestone]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Confetti />
        <Lumi state="celebrate" size={128} />
        <Text style={styles.title}>{milestone ? t(milestone.titleKey) : t('lesson.wellDone')} 🎉</Text>
        <View style={styles.xpChip}>
          <Text style={styles.xpText}>{t('lesson.xpEarned', { xp: fmt(xpGained) })}</Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakText}>🔥 {fmt(streak)}</Text>
          </View>
        )}
        <PressableScale style={styles.button} onPress={onDismiss}>
          <Text style={styles.buttonText}>{t('lesson.continue')}</Text>
        </PressableScale>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textInverse,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  xpChip: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 4,
    borderBottomColor: '#CF8D15',
  },
  xpText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xl,
    color: colors.primaryDark,
  },
  streakChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  streakText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderBottomWidth: 4,
    borderBottomColor: colors.border,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.primaryDark,
  },
});
