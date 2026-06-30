import { colors, spacing, typography, radius } from '../theme';

describe('theme tokens', () => {
  it('has required color keys', () => {
    expect(colors.primary).toBeDefined();
    expect(colors.accent).toBeDefined();
    expect(colors.background).toBeDefined();
    expect(colors.error).toBeDefined();
  });

  it('spacing scale is ordered small to large', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm);
    expect(spacing.sm).toBeLessThan(spacing.md);
    expect(spacing.md).toBeLessThan(spacing.lg);
    expect(spacing.lg).toBeLessThan(spacing.xl);
  });

  it('typography has Arabic font family defined', () => {
    expect(typography.fontFamily.arabic).toBe('Cairo');
    expect(typography.fontFamily.arabicBold).toBe('Cairo-Bold');
    expect(typography.fontFamily.arabicSemiBold).toBe('Cairo-SemiBold');
  });

  it('radius.full is a large number for pill shapes', () => {
    expect(radius.full).toBeGreaterThan(100);
  });
});
