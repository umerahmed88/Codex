// ============================================================================
// Locale-parity test. A missing translation is a real bug: a screen renders a
// raw key ("coach.title") instead of text. This walks both locale files and
// fails if their key structures ever drift apart — catching untranslated or
// orphaned strings before they ship.
// ============================================================================
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

// Flatten a nested translation object into dotted key paths.
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object'
      ? keyPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

describe('i18n locale parity', () => {
  const arKeys = keyPaths(ar).sort();
  const enKeys = keyPaths(en).sort();

  it('Arabic and English define exactly the same keys', () => {
    const missingInEn = arKeys.filter((k) => !enKeys.includes(k));
    const missingInAr = enKeys.filter((k) => !arKeys.includes(k));
    expect({ missingInEn, missingInAr }).toEqual({ missingInEn: [], missingInAr: [] });
  });

  it('has no empty string values in either locale', () => {
    const empties = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) => {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object') return empties(v as Record<string, unknown>, path);
        return v === '' ? [path] : [];
      });
    expect(empties(ar)).toEqual([]);
    expect(empties(en)).toEqual([]);
  });
});
