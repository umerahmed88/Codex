import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PurchasesPackage } from 'react-native-purchases';
import { getCurrentOffering, purchase, restore, hasPremium } from '../src/lib/purchases';
import { useSubscription } from '../src/lib/SubscriptionProvider';
import { Button } from '../src/components/Button';
import { colors, spacing, typography, radius, shadows } from '../src/theme';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh } = useSubscription();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentOffering()
      .then((offering) => {
        const pkgs = offering?.availablePackages ?? [];
        setPackages(pkgs);
        setSelected(pkgs[0] ?? null);
      })
      .catch(() => setError(t('paywall.unavailable')))
      .finally(() => setLoading(false));
  }, [t]);

  // Turn a store product's billing period (ISO 8601 like "P4W") into Arabic.
  const periodLabel = (pkg: PurchasesPackage): string => {
    const period = pkg.product.subscriptionPeriod ?? 'default';
    return t(`paywall.period.${period}`, { defaultValue: t('paywall.period.default') });
  };

  const handleSubscribe = async () => {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      const info = await purchase(selected);
      await refresh();
      if (hasPremium(info)) router.back();
    } catch (e) {
      // RevenueCat throws userCancelled — don't treat that as an error.
      if (!(e as { userCancelled?: boolean })?.userCancelled) {
        setError(t('paywall.purchaseError'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const info = await restore();
      await refresh();
      if (hasPremium(info)) router.back();
    } catch {
      setError(t('paywall.purchaseError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable style={styles.close} onPress={() => router.back()}>
          <Text style={styles.closeText}>{t('paywall.close')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('paywall.title')}</Text>
        <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

        <View style={styles.benefits}>
          {['benefit1', 'benefit2', 'benefit3'].map((k) => (
            <Text key={k} style={styles.benefit}>✓ {t(`paywall.${k}`)}</Text>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : packages.length === 0 ? (
          <Text style={styles.error}>{t('paywall.unavailable')}</Text>
        ) : (
          <>
            {packages.map((pkg) => {
              const isSel = selected?.identifier === pkg.identifier;
              return (
                <Pressable
                  key={pkg.identifier}
                  style={[styles.plan, isSel && styles.planSelected]}
                  onPress={() => setSelected(pkg)}
                >
                  <Text style={[styles.planPeriod, isSel && styles.planTextSel]}>
                    {periodLabel(pkg)}
                  </Text>
                  <Text style={[styles.planPrice, isSel && styles.planTextSel]}>
                    {pkg.product.priceString}
                  </Text>
                </Pressable>
              );
            })}

            {/* Renewal terms shown BEFORE purchase — deliberate, no surprises. */}
            {selected && (
              <Text style={styles.terms}>
                {t('paywall.renewalTerms', {
                  price: selected.product.priceString,
                  period: periodLabel(selected),
                })}
              </Text>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <Button title={t('paywall.subscribe')} onPress={handleSubscribe} loading={busy} />

            <Pressable style={styles.restore} onPress={handleRestore} disabled={busy}>
              <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  close: { alignSelf: 'flex-start', padding: spacing.sm },
  closeText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textMuted,
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginTop: spacing.md,
  },
  subtitle: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: typography.size.md * typography.lineHeight.normal,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefits: { gap: spacing.sm, marginBottom: spacing.lg },
  benefit: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.success,
    textAlign: 'right',
  },
  plan: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  planSelected: { borderColor: colors.primary },
  planPeriod: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  planPrice: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.lg,
    color: colors.textSecondary,
  },
  planTextSel: { color: colors.primary },
  terms: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    marginVertical: spacing.md,
  },
  error: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  restore: { alignItems: 'center', padding: spacing.md, marginTop: spacing.sm },
  restoreText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.primaryLight,
  },
});
