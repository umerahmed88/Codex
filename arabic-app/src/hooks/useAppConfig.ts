// ============================================================================
// Fetches the remote launch-ops config (kill-switches, staged rollout,
// force-update floor) and exposes typed helpers over it.
//
// The config is read once on launch and cached for the session with a light
// background refresh, so pulling a kill-switch reaches users within minutes
// without them restarting. On any fetch failure we fall back to DEFAULT_CONFIG
// (everything ON) — a config outage must never dark-launch the whole app.
// ============================================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import {
  AppConfig,
  DEFAULT_CONFIG,
  FeatureFlagKey,
  isFeatureEnabled,
  isUpdateRequired,
} from '../lib/featureFlags';
import { APP_VERSION } from '../lib/appInfo';

// Refetch at most every 5 minutes; a stale flag for a few minutes is fine and
// this keeps us off the network on every screen focus.
const CONFIG_STALE_MS = 5 * 60 * 1000;

function useAppConfig(): AppConfig {
  const { data } = useQuery<AppConfig>({
    queryKey: ['app-config'],
    staleTime: CONFIG_STALE_MS,
    // Never surface a config error to the user — fall back to defaults.
    placeholderData: DEFAULT_CONFIG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('flags, min_supported_version')
        .eq('id', 1)
        .single();
      if (error || !data) return DEFAULT_CONFIG;
      return {
        flags: (data.flags as AppConfig['flags']) ?? {},
        minSupportedVersion: data.min_supported_version ?? '',
      };
    },
  });
  return data ?? DEFAULT_CONFIG;
}

// Is a given feature on for the current (possibly signed-out) user?
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const config = useAppConfig();
  const { session } = useAuth();
  return isFeatureEnabled(config, key, session?.user?.id);
}

// Should the app show the blocking "update required" screen?
export function useUpdateRequired(): boolean {
  const config = useAppConfig();
  return isUpdateRequired(APP_VERSION, config.minSupportedVersion);
}
