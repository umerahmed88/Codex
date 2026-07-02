// ============================================================================
// Force-update kill-switch UI. When the remote `min_supported_version` is
// raised above this build (e.g. after shipping a broken release), this screen
// blocks the whole app and sends the user to the store — no client code can
// bypass it. When no minimum applies, it renders children untouched.
// ============================================================================
import { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUpdateRequired } from '../hooks/useAppConfig';
import { colors, spacing, typography, radius } from '../theme';

// TODO: replace with your real store listing IDs before store submission.
const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id000000000'
    : 'https://play.google.com/store/apps/details?id=com.example.arabicapp';

export function UpdateGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const updateRequired = useUpdateRequired();

  if (!updateRequired) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('update.title')}</Text>
      <Text style={styles.body}>{t('update.body')}</Text>
      <Pressable
        style={styles.button}
        onPress={() => Linking.openURL(STORE_URL)}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{t('update.button')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
});
