import { APPEARANCE_DEFAULTS, APPEARANCE_KEY, applyAppearance, contrastRatio, normalizeAppearance, readAppearance, resetAppearance, saveAppearance } from './appearance';

afterEach(() => {
  localStorage.clear();
  resetAppearance('light');
});

test('rejects arbitrary CSS and invalid colors from stored appearance', () => {
  const a = normalizeAppearance({ light: { primary: 'red;position:fixed', text: '#abcdef', hacked: '#aabbcc' },
    density: 'unsafe', spacing: 999, textScale: -5 });
  expect(a.light.primary).toBe(APPEARANCE_DEFAULTS.light.primary);
  expect(a.light.text).toBe('#abcdef');
  expect(a.light.hacked).toBeUndefined();
  expect(a.spacing).toBe(4);
  expect(a.density).toBe('comfortable');
});

test('saves sanitized settings, switches palettes and resets', () => {
  const next = saveAppearance({ light: { primary: '#112233' }, dark: { primary: '#aabbcc' },
    textScale: 110, radiusScale: 125, spacing: 5, density: 'compact' }, 'light');
  expect(localStorage.getItem(APPEARANCE_KEY)).toContain('#112233');
  expect(readAppearance()).toEqual(next);
  expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#112233');
  expect(document.documentElement.dataset.density).toBe('compact');
  applyAppearance(next, 'dark');
  expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#aabbcc');
  resetAppearance('light');
  expect(localStorage.getItem(APPEARANCE_KEY)).toBeNull();
});

test('contrast diagnostics use WCAG luminance', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
  expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 2);
});
