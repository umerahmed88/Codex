import {
  AppConfig,
  DEFAULT_CONFIG,
  compareVersions,
  isFeatureEnabled,
  isUpdateRequired,
  rolloutBucket,
} from '../lib/featureFlags';

const configWith = (flags: AppConfig['flags']): AppConfig => ({
  flags,
  minSupportedVersion: '',
});

describe('rolloutBucket', () => {
  it('is deterministic for the same flag+user', () => {
    expect(rolloutBucket('coach', 'user-1')).toBe(rolloutBucket('coach', 'user-1'));
  });

  it('always lands in 0..99', () => {
    for (const id of ['a', 'b', 'longer-user-id-xyz', '']) {
      const b = rolloutBucket('coach', id);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });

  it('buckets a user independently per flag', () => {
    // Not guaranteed different, but the hash mixes the key in — assert the
    // function actually depends on the key by finding a differing pair.
    const anyDiff = ['u1', 'u2', 'u3'].some(
      (id) => rolloutBucket('coach', id) !== rolloutBucket('paywall', id)
    );
    expect(anyDiff).toBe(true);
  });

  it('spreads roughly evenly across a population', () => {
    let under50 = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      if (rolloutBucket('coach', `user-${i}`) < 50) under50++;
    }
    // Expect ~50%; allow a generous band so the test isn't flaky.
    expect(under50).toBeGreaterThan(N * 0.4);
    expect(under50).toBeLessThan(N * 0.6);
  });
});

describe('isFeatureEnabled', () => {
  it('kill-switch off beats any rollout percentage', () => {
    const cfg = configWith({ coach: { enabled: false, rolloutPercentage: 100 } });
    expect(isFeatureEnabled(cfg, 'coach', 'user-1')).toBe(false);
  });

  it('100% (or unset) is on for everyone, including signed-out users', () => {
    expect(isFeatureEnabled(configWith({ coach: { enabled: true } }), 'coach', undefined)).toBe(true);
    expect(
      isFeatureEnabled(configWith({ coach: { enabled: true, rolloutPercentage: 100 } }), 'coach', 'u')
    ).toBe(true);
  });

  it('0% is off for everyone', () => {
    const cfg = configWith({ coach: { enabled: true, rolloutPercentage: 0 } });
    expect(isFeatureEnabled(cfg, 'coach', 'user-1')).toBe(false);
  });

  it('signed-out users never enter a partial rollout', () => {
    const cfg = configWith({ coach: { enabled: true, rolloutPercentage: 50 } });
    expect(isFeatureEnabled(cfg, 'coach', undefined)).toBe(false);
  });

  it('a partial rollout matches the bucket decision', () => {
    const pct = 50;
    const cfg = configWith({ coach: { enabled: true, rolloutPercentage: pct } });
    const id = 'user-42';
    expect(isFeatureEnabled(cfg, 'coach', id)).toBe(rolloutBucket('coach', id) < pct);
  });

  it('falls back to safe defaults (on) for an unconfigured flag', () => {
    expect(isFeatureEnabled(configWith({}), 'coach', 'user-1')).toBe(true);
  });

  it('DEFAULT_CONFIG has every known feature enabled', () => {
    for (const key of ['coach', 'paywall', 'notifications', 'feedback'] as const) {
      expect(isFeatureEnabled(DEFAULT_CONFIG, key, 'u')).toBe(true);
    }
  });
});

describe('compareVersions', () => {
  it('orders versions correctly', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
  });
});

describe('isUpdateRequired', () => {
  it('never blocks when no minimum is configured', () => {
    expect(isUpdateRequired('1.0.0', '')).toBe(false);
  });

  it('blocks builds below the minimum', () => {
    expect(isUpdateRequired('1.0.0', '1.1.0')).toBe(true);
  });

  it('allows builds at or above the minimum', () => {
    expect(isUpdateRequired('1.1.0', '1.1.0')).toBe(false);
    expect(isUpdateRequired('1.2.0', '1.1.0')).toBe(false);
  });
});
