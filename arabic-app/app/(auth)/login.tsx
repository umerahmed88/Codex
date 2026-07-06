import { useEffect, useState } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/lib/AuthProvider';
import {
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
} from '../../src/lib/socialAuth';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Social buttons are invisible until configured (Phase 15): Apple needs an
  // iOS device with the capability; Google needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
  const [appleAvailable, setAppleAvailable] = useState(false);
  const googleAvailable = isGoogleSignInAvailable();
  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // On success the AuthGate redirects into the app automatically.
    } catch {
      setError(t('auth.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: 'apple' | 'google') => {
    setError(null);
    try {
      if (provider === 'apple') await signInWithApple();
      else await signInWithGoogle();
      // AuthGate redirects on success, same as email login.
    } catch (e) {
      // Backing out of the provider sheet isn't an error — stay quiet.
      if (e instanceof Error && e.message === 'cancelled') return;
      setError(t('auth.errorGeneric'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{t('auth.loginTitle')}</Text>

      <TextField
        testID="email"
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        testID="password"
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title={t('auth.loginButton')} onPress={handleLogin} loading={loading} />

      {(appleAvailable || googleAvailable) && (
        <>
          {appleAvailable && (
            <Pressable
              style={styles.socialButton}
              onPress={() => handleSocial('apple')}
              accessibilityRole="button"
            >
              <Text style={styles.socialText}>{t('auth.appleSignIn')}</Text>
            </Pressable>
          )}
          {googleAvailable && (
            <Pressable
              style={styles.socialButton}
              onPress={() => handleSocial('google')}
              accessibilityRole="button"
            >
              <Text style={styles.socialText}>{t('auth.googleSignIn')}</Text>
            </Pressable>
          )}
        </>
      )}

      <Link href="/(auth)/forgot-password" style={styles.link}>
        <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
      </Link>
      <Link href="/(auth)/signup" style={styles.link}>
        <Text style={styles.linkText}>{t('auth.toSignup')}</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.xl,
  },
  error: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.error,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  socialButton: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  socialText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  link: {
    marginTop: spacing.lg,
  },
  linkText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.primaryLight,
    textAlign: 'center',
  },
});
