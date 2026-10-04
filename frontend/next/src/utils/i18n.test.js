import { enMessages, faMessages, formatUiDate, formatUiNumber, translateRaw } from '../i18n';

describe('Persian i18n', () => {
  test('English and Persian semantic dictionaries have identical, non-empty keys', () => {
    expect(Object.keys(faMessages).sort()).toEqual(Object.keys(enMessages).sort());
    Object.entries(faMessages).forEach(([key, value]) => {
      expect(typeof value).toBe('string');
      expect(value.trim()).not.toBe('');
      expect(enMessages[key].trim()).not.toBe('');
    });
  });
  test('translates shell navigation labels', () => {
    expect(translateRaw('Analytics', 'fa')).toBe('تحلیل و آمار');
    expect(translateRaw('Calendar', 'fa')).toBe('تقویم');
    expect(translateRaw('Schedule Post', 'fa')).toBe('زمان‌بندی پست');
  });

  test('formats numbers with Persian digits', () => {
    expect(formatUiNumber(1405, 'fa')).toBe('۱٬۴۰۵');
  });

  test('formats dates using the Persian calendar', () => {
    const value = new Date(2026, 8, 23, 12, 0, 0);
    const formatted = formatUiDate(value, { year: 'numeric', month: 'long', day: 'numeric' }, 'fa');
    expect(formatted).toContain('۱۴۰۵');
    expect(formatted).toContain('مهر');
    expect(formatted).toContain('۱');
  });
});
