import { useEffect, useState } from 'react';
import { Modal, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Milestone } from '@/lib/milestones';
import { colors, spacing, typography, radius, shadows } from '@/theme';

// A tasteful, one-tap-to-dismiss celebration. A single gentle scale-in — no
// confetti spam, no dark-pattern "keep going" pressure.
export function MilestoneCelebration({
  milestone,
  onDismiss,
}: {
  milestone: Milestone | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  // Lazy state init: the Animated.Value is created exactly once and is never
  // re-set, so it's stable across renders without touching a ref in render.
  const [scale] = useState(() => new Animated.Value(0.8));

  useEffect(() => {
    if (milestone) {
      scale.setValue(0.8);
      Animated.timing(scale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start();
    }
  }, [milestone, scale]);

  if (!milestone) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Text style={styles.emoji}>{milestone.emoji}</Text>
          <Text style={styles.title}>{t(milestone.titleKey)}</Text>
          <Pressable style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>{t('gamify.celebrate')}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,35,56,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    ...shadows.md,
  },
  emoji: { fontSize: 64, marginBottom: spacing.md },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
});
