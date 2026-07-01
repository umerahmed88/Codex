import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { colors, spacing, typography, radius } from '@/theme';

interface Props extends TextInputProps {
  label: string;
}

// A labelled input styled for RTL Arabic. Single responsibility: render one
// form field with a label above it.
export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        textAlign="right"
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
});
