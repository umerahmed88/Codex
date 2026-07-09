import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import i18n from '@/lib/i18n';
import { colors, spacing, typography, radius } from '@/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry is initialized at the app root; it auto-captures unhandled errors.
    // Explicit capture here ensures boundary-caught errors also reach Sentry.
    try {
      // Dynamic require so this component doesn't hard-depend on Sentry being init'd
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Sentry } = require('@/lib/sentry') as typeof import('@/lib/sentry');
      Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    } catch {
      // Sentry unavailable in this environment — swallow silently
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        {/* Class component can't use the useTranslation hook — read the i18n
            instance directly. Language is restored at boot, so it's correct by
            the time any error renders. */}
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>{i18n.t('error.title')}</Text>
        <Text style={styles.subtitle}>{i18n.t('error.subtitle')}</Text>
        <Pressable style={styles.button} onPress={this.handleRetry}>
          <Text style={styles.buttonText}>{i18n.t('error.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    direction: 'rtl',
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.normal,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
    textAlign: 'center',
  },
});
