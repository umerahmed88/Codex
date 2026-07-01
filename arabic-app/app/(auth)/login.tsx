import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/lib/AuthProvider';
import { colors, spacing, typography } from '../../src/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{t('auth.loginTitle')}</Text>

      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title={t('auth.loginButton')} onPress={handleLogin} loading={loading} />

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
