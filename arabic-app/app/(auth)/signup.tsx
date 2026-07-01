import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/lib/AuthProvider';
import { colors, spacing, typography } from '../../src/theme';

export default function SignupScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim() || undefined);
      // Depending on the project's email-confirmation setting, the user may
      // need to confirm before logging in — so we show a friendly notice.
      setNotice(t('auth.signupSuccess'));
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
      <Text style={styles.title}>{t('auth.signupTitle')}</Text>

      <TextField label={t('auth.displayName')} value={displayName} onChangeText={setDisplayName} />
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
        autoComplete="password-new"
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Button title={t('auth.signupButton')} onPress={handleSignup} loading={loading} />

      <Link href="/(auth)/login" style={styles.link}>
        <Text style={styles.linkText}>{t('auth.toLogin')}</Text>
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
  notice: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.success,
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
