import { Pressable, Text, ActivityIndicator, StyleSheet, type PressableProps } from 'react-native';
import { colors, spacing, typography, radius } from '@/theme';

interface Props extends PressableProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

// A single button component with a loading state, so every screen shows a
// spinner during async work instead of a dead, tappable button.
export function Button({ title, loading, variant = 'primary', disabled, style, ...rest }: Props) {
  const isSecondary = variant === 'secondary';
  return (
    <Pressable
      disabled={disabled || loading}
      style={[
        styles.base,
        isSecondary ? styles.secondary : styles.primary,
        (disabled || loading) && styles.disabled,
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : colors.textInverse} />
      ) : (
        <Text style={[styles.text, isSecondary && styles.textSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
  textSecondary: {
    color: colors.primary,
  },
});
