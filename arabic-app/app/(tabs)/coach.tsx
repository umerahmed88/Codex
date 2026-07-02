import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/lib/AuthProvider';
import { useSubscription } from '../../src/lib/SubscriptionProvider';
import { useAskCoach, useCoachQuestionsToday } from '../../src/hooks/useCoach';
import { useFeatureFlag } from '../../src/hooks/useAppConfig';
import { remainingQuestions, type CoachTurn } from '../../src/lib/coach';
import { track } from '../../src/lib/analytics';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function CoachScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { isSubscribed } = useSubscription();
  const coachEnabled = useFeatureFlag('coach');
  const ask = useAskCoach();
  const { data: askedToday = 0, refetch } = useCoachQuestionsToday(userId);
  const left = remainingQuestions(askedToday, isSubscribed);

  const handleSend = () => {
    const question = input.trim();
    if (!question || ask.isPending) return;
    setError(null);
    setInput('');
    setTurns((prev) => [...prev, { role: 'user', text: question }]);
    track('coach_question_asked');

    ask.mutate(question, {
      onSuccess: (data) => {
        setTurns((prev) => [...prev, { role: 'coach', text: data.answer, citation: data.citation }]);
        refetch();
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      },
      onError: (e) => {
        setError(e.message === 'rate_limited' ? t('coach.rateLimited') : t('coach.error'));
      },
    });
  };

  // Kill-switch: if the Coach is remotely disabled (e.g. an LLM cost spike or
  // an outage), show an "unavailable" state instead of a broken chat.
  if (!coachEnabled) {
    return (
      <View style={[styles.container, styles.disabledWrap]}>
        <Text style={styles.disabled}>{t('coach.disabled')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
        {turns.length === 0 && <Text style={styles.intro}>{t('coach.intro')}</Text>}

        {turns.map((turn, i) => (
          <View
            key={i}
            style={[turn.role === 'user' ? styles.userBubble : styles.coachBubble]}
          >
            <Text style={turn.role === 'user' ? styles.userText : styles.coachText}>
              {turn.text}
            </Text>
            {turn.citation && (
              <Pressable onPress={() => router.push(`/lesson/${turn.citation!.lesson_id}`)}>
                <Text style={styles.citation}>
                  {t('coach.source', { title: turn.citation.title })}
                </Text>
              </Pressable>
            )}
          </View>
        ))}

        {ask.isPending && (
          <View style={styles.coachBubble}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.thinking}>{t('coach.thinking')}</Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      {Number.isFinite(left) && (
        <Text style={styles.remaining}>{t('coach.remaining', { count: left })}</Text>
      )}

      <View style={styles.inputRow}>
        <TextInput
          testID="coach-input"
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('coach.placeholder')}
          placeholderTextColor={colors.textMuted}
          textAlign="right"
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || ask.isPending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || ask.isPending}
        >
          <Text style={styles.sendText}>{t('coach.send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  disabledWrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  disabled: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  messages: { padding: spacing.lg, gap: spacing.md },
  intro: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  userBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    maxWidth: '85%',
  },
  coachBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    maxWidth: '85%',
  },
  userText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textInverse,
    textAlign: 'right',
  },
  coachText: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    textAlign: 'right',
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  citation: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.sm,
    color: colors.primaryLight,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  thinking: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  error: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.sm,
    color: colors.error,
    textAlign: 'center',
  },
  remaining: {
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
    paddingBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.arabic,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: {
    fontFamily: typography.fontFamily.arabicSemiBold,
    fontSize: typography.size.md,
    color: colors.textInverse,
  },
});
