// ============================================================================
// Which track is the user working on? (Phase 14 — multi-track)
//
// A tiny Zustand store so Today and Learn always agree on the selected track
// without prop-drilling. The choice persists to AsyncStorage; on first launch
// (nothing stored) the onboarding interest decides the starting track — see
// interestToTrackSlug in src/lib/tracks.ts.
// ============================================================================
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { interestToTrackSlug } from '../lib/tracks';

const KEY = 'settings:selectedTrack';

interface SelectedTrackState {
  // null = not hydrated yet; useTrackData falls back to the first track.
  slug: string | null;
  select: (slug: string) => void;
}

export const useSelectedTrack = create<SelectedTrackState>((set) => ({
  slug: null,
  select: (slug) => {
    set({ slug });
    AsyncStorage.setItem(KEY, slug).catch(() => {
      // Persistence is best-effort; the in-memory choice still applies.
    });
  },
}));

// Hydrate once on app start (module load), mirroring the i18n locale pattern:
// an explicit previous choice wins; otherwise the onboarding interest decides.
void (async () => {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      useSelectedTrack.setState({ slug: stored });
      return;
    }
    const interest = await AsyncStorage.getItem('onboarding:interest');
    useSelectedTrack.setState({ slug: interestToTrackSlug(interest) });
  } catch {
    // Leave slug null — the first track is a safe default.
  }
})();
