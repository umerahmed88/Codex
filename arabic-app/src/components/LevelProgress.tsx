import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { levelProgress } from '@/lib/xp';
import { colors, spacing, typography, radius } from '@/theme';

// Shows the current level and a progress bar toward the next one.
export function LevelProgress({ totalXp }: { totalXp: number }) {
  const { t } = useTranslation();
  const { level, nextLevelXp, progress } = levelProgress(totalXp);
  const pct = Math.max(0, Math.min(1, progress)) * 100;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.level}>{t('gamify.level', { level })}</Text>
        <Text style={styles.xp}>{t('gamify.xpOf', { current: totalXp, next: nextLevelXp })}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: spacing.md },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  level: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  xp: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  track: {
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
});
