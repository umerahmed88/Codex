import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSubmitFeedback } from '../src/hooks/useSubmitFeedback';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_LENGTH,
  FeedbackCategory,
  validateFeedback,
} from '../src/lib/feedback';
import { colors, spacing, typography, radius } from '../src/theme';

// Maps a category to its localized label so the chips render in the UI language.
const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'feedback.categoryBug',
  idea: 'feedback.categoryIdea',
  content: 'feedback.categoryContent',
  other: 'feedback.categoryOther',
};

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const submit = useSubmitFeedback();

  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const canSubmit = validateFeedback({ category, message }).ok && !submit.isPending;

  const onSubmit = async () => {
    try {
      await submit.mutateAsync({ category, message });
      setSent(true);
      // Give the user a moment to read the thank-you, then close.
      setTimeout(() => router.back(), 1200);
    } catch {
      // Error surfaced below via submit.isError.
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.success}>{t('feedback.success')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('feedback.title')}</Text>
      <Text style={styles.intro}>{t('feedback.intro')}</Text>

      <View style={styles.chips}>
        {FEEDBACK_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, category === c && styles.chipActive]}
            onPress={() => setCategory(c)}
            accessibilityRole="button"
            accessibilityState={{ selected: category === c }}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
              {t(CATEGORY_LABELS[c])}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('feedback.placeholder')}
        placeholderTextColor={colors.textMuted}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={FEEDBACK_MAX_LENGTH}
        textAlign="right"
        accessibilityLabel={t('feedback.placeholder')}
      />

      {submit.isError && <Text style={styles.error}>{t('feedback.error')}</Text>}

      <Pressable
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
      >
        <Text style={styles.submitText}>
          {submit.isPending ? t('feedback.submitting') : t('feedback.submit')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.xxl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  intro: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  chipTextActive: { color: colors.textInverse },
  input: {
    minHeight: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  error: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.error,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
  success: {
    fontFamily: typography.fontFamily.arabicBold,
    fontSize: typography.size.lg,
    color: colors.success,
    textAlign: 'center',
  },
});
