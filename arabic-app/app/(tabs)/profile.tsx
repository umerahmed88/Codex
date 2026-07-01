import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/lib/i18n';
import { colors, spacing, typography, radius } from '../../src/theme';
import { Pressable } from 'react-native';

export default function ProfileScreen() {
  const { t } = useTranslation();

  const toggleLocale = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>{t('profile.streak')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>{t('profile.xp')}</Text>
        </View>
      </View>

      {/* Language toggle for testing i18n */}
      <Pressable style={styles.langButton} onPress={toggleLocale}>
        <Text style={styles.langButtonText}>
          {i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  langButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  langButtonText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
});
