// ============================================================================
// Writes an in-app feedback submission to Supabase and emits the analytics
// event. Validation lives in lib/feedback.ts so it's shared with the UI; this
// hook is just the network write + telemetry.
// ============================================================================
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { FeedbackDraft, toFeedbackRow, validateFeedback } from '../lib/feedback';
import { APP_VERSION, PLATFORM } from '../lib/appInfo';
import { track } from '../lib/analytics';

export function useSubmitFeedback() {
  const { session } = useAuth();

  return useMutation<void, Error, FeedbackDraft>({
    mutationFn: async (draft) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('not_authenticated');

      const valid = validateFeedback(draft);
      if (!valid.ok) throw new Error(valid.reason);

      const row = toFeedbackRow(draft, { appVersion: APP_VERSION, platform: PLATFORM });
      const { error } = await supabase.from('user_feedback').insert({ ...row, user_id: userId });
      if (error) throw error;

      track('feedback_submitted', { category: row.category });
    },
  });
}
