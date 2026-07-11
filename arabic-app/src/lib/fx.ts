// ============================================================================
// fx — tactile + audio feedback for the Lumi redesign.
//
// Haptics (expo-haptics) and short sound effects (expo-audio) that make the app
// feel alive. EVERYTHING here is best-effort and fully guarded: on web, in Expo
// Go without support, or if a module fails to load, each call is a silent
// no-op — feedback must never crash a screen. Sounds are tiny synthesized WAVs
// bundled in assets/sfx (no downloads).
// ============================================================================
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// --- Haptics -----------------------------------------------------------------
export function hapticTap(): void {
  if (!isNative) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
export function hapticSuccess(): void {
  if (!isNative) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
export function hapticSelection(): void {
  if (!isNative) return;
  Haptics.selectionAsync().catch(() => {});
}

// --- Sound -------------------------------------------------------------------
// Players are created once and reused. If creation throws (unsupported), we
// remember null and never retry.
type SfxName = 'pop' | 'success' | 'levelup';
const SOURCES: Record<SfxName, number> = {
  pop: require('../../assets/sfx/pop.wav'),
  success: require('../../assets/sfx/success.wav'),
  levelup: require('../../assets/sfx/levelup.wav'),
};
const players: Partial<Record<SfxName, AudioPlayer | null>> = {};

function playSfx(name: SfxName): void {
  if (!isNative) return;
  try {
    let p = players[name];
    if (p === undefined) {
      p = createAudioPlayer(SOURCES[name]);
      players[name] = p;
    }
    if (!p) return;
    p.seekTo(0);
    p.play();
  } catch {
    players[name] = null; // give up on this sound for the session
  }
}

// --- Combined moments (what screens actually call) ---------------------------
export function fxTap(): void {
  hapticTap();
}
export function fxLessonComplete(): void {
  hapticSuccess();
  playSfx('success');
}
export function fxLevelUp(): void {
  hapticSuccess();
  playSfx('levelup');
}
export function fxPop(): void {
  hapticSelection();
  playSfx('pop');
}
