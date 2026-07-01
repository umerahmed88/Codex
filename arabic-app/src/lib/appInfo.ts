// ============================================================================
// Static app/device info used by launch-ops (force-update, feedback context).
//
// APP_VERSION is kept in sync with `version` in app.json by hand — there is a
// test that fails if they drift, so this can't silently rot. We read it from a
// constant here (rather than pulling in expo-constants) to keep this module
// pure and importable from tests without a native runtime.
// ============================================================================
import { Platform } from 'react-native';

// MUST match the `version` field in app.json (asserted by appInfo.test.ts).
export const APP_VERSION = '1.0.0';

export const PLATFORM = Platform.OS;
