import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { useNotificationSettings } from '../../src/hooks/useNotificationSettings';
import { Button } from '../../src/components/Button';
import { colors, spacing, typography, radius } from '../../src/theme';

const SLIDES = 3;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { complete } = useOnboarding();
  const { settings, update } = useNotificationSettings();

  const [step, setStep] = useState(0);
  const [interest, setInterest] = useState<string | null>(null);

  const finish = async () => {
    if (interest) await AsyncStorage.setItem('onboarding:interest', interest);
    await complete(); // the AuthGate then routes to sign-up / the app
  };

  const next = () => {
    if (step < SLIDES - 1) setStep(step + 1);
    else finish();
  };

  const interests = [
    { key: 'interestCommunication', emoji: '💬' },
    { key: 'interestConfidence', emoji: '✨' },
    { key: 'interestLeadership', emoji: '🎯' },
  ];

  return (
    <View style={styles.container}>
      <Pressable style={styles.skip} onPress={finish} accessibilityRole="button">
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </Pressable>

      <View style={styles.body}>
        {step === 0 && (
          <>
            <Text style={styles.emoji}>🌱</Text>
            <Text style={styles.title}>{t('onboarding.slide1Title')}</Text>
            <Text style={styles.text}>{t('onboarding.slide1Body')}</Text>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>{t('onboarding.slide2Title')}</Text>
            <Text style={styles.text}>{t('onboarding.slide2Body')}</Text>
            <View style={styles.interests}>
              {interests.map((it) => {
                const sel = interest === it.key;
                return (
                  <Pressable
                    key={it.key}
                    style={[styles.interest, sel && styles.interestSel]}
                    onPress={() => setInterest(it.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                  >
                    <Text style={styles.interestEmoji}>{it.emoji}</Text>
                    <Text style={[styles.interestText, sel && styles.interestTextSel]}>
                      {t(`onboarding.${it.key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.emoji}>🔔</Text>
            <Text style={styles.title}>{t('onboarding.slide3Title')}</Text>
            <Text style={styles.text}>{t('onboarding.slide3Body')}</Text>
            <View style={styles.reminderRow}>
              <Text style={styles.reminderLabel}>{t('onboarding.enableReminder')}</Text>
              <Switch
                value={settings.enabled}
                onValueChange={(v) => {
                  void update({ ...settings, enabled: v });
                }}
              />
            </View>
          </>
        )}
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {Array.from({ length: SLIDES }).map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <Button
        title={step === SLIDES - 1 ? t('onboarding.start') : t('onboarding.next')}
        onPress={next}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  skip: { alignSelf: 'flex-start', padding: spacing.sm },
  skipText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textMuted,
  },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 72 },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  text: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    paddingHorizontal: spacing.md,
  },
  interests: { gap: spacing.md, marginTop: spacing.lg, width: '100%' },
  interest: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  interestSel: { borderColor: colors.primary },
  interestEmoji: { fontSize: 28 },
  interestText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  interestTextSel: { color: colors.primary },
  reminderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  reminderLabel: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 20 },
});
