import { View, Text, StyleSheet } from 'react-native';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { colors, spacing, typography, radius } from '@/theme';

// A compact flame + streak count. Greyed out when the streak is broken/zero so
// the flame visually "goes cold".
export function StreakBadge({ count, active }: { count: number; active: boolean }) {
  const fmt = useFormatNumber();
  return (
    <View style={[styles.pill, !active && styles.pillCold]}>
      <Text style={styles.flame}>{active ? '🔥' : '🧊'}</Text>
      <Text style={[styles.count, !active && styles.countCold]}>{fmt(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  pillCold: { opacity: 0.7 },
  flame: { fontSize: 18 },
  count: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.lg,
    color: colors.streak,
  },
  countCold: { color: colors.textMuted },
});
