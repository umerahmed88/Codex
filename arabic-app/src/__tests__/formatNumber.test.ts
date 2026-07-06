import { toArabicDigits, formatNumber } from '../lib/formatNumber';

describe('toArabicDigits', () => {
  it('maps every Western digit to Arabic-Indic', () => {
    expect(toArabicDigits('0123456789')).toBe('٠١٢٣٤٥٦٧٨٩');
  });

  it('leaves non-digit characters untouched', () => {
    expect(toArabicDigits('1,234')).toBe('١,٢٣٤');
    expect(toArabicDigits('-5%')).toBe('-٥%');
  });

  it('accepts a number directly', () => {
    expect(toArabicDigits(42)).toBe('٤٢');
  });
});

describe('formatNumber', () => {
  it('uses Arabic-Indic digits with grouping for ar', () => {
    expect(formatNumber(1234, 'ar')).toBe('١,٢٣٤');
    expect(formatNumber(7, 'ar')).toBe('٧');
    expect(formatNumber(1000000, 'ar')).toBe('١,٠٠٠,٠٠٠');
  });

  it('uses Western digits for en (and any non-ar locale)', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(1234, 'fr')).toBe('1,234');
  });

  it('matches on the ar language subtag (e.g. ar-SA)', () => {
    expect(formatNumber(5, 'ar-SA')).toBe('٥');
  });

  it('truncates fractional input', () => {
    expect(formatNumber(3.9, 'en')).toBe('3');
    expect(formatNumber(3.9, 'ar')).toBe('٣');
  });
});
