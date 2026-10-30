import { persistentStorage } from './runtime/storage';

export const APPEARANCE_KEY = 'ravinta.appearance.v1';
export const APPEARANCE_DEFAULTS = Object.freeze({
  light: { primary: '#123d3a', onPrimary: '#ffffff', page: '#f7f9f8', card: '#ffffff', text: '#172a28' },
  dark: { primary: '#d6f268', onPrimary: '#123d3a', page: '#102b29', card: '#173a35', text: '#f7f9f8' },
  textScale: 100,
  radiusScale: 100,
  spacing: 4,
  density: 'comfortable',
  motion: 'system',
});
const COLORS = ['primary', 'onPrimary', 'page', 'card', 'text'];
const HEX = /^#[0-9a-f]{6}$/i;
const SIZES = { xs: 11, sm: 13, base: 14, md: 15, lg: 16, xl: 18, '2xl': 22, '3xl': 28, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72 };
const RADII = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, '2xl': 28 };

const numberInRange = (value, min, max, fallback) =>
  Number.isFinite(value) && value >= min && value <= max ? Math.round(value) : fallback;

/** Never accept arbitrary CSS property names or free-form CSS from storage or API payloads. */
export function normalizeAppearance(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const result = {};
  for (const mode of ['light', 'dark']) {
    const palette = source[mode] && typeof source[mode] === 'object' ? source[mode] : {};
    result[mode] = {};
    for (const field of COLORS) {
      const value = palette[field];
      result[mode][field] = typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : APPEARANCE_DEFAULTS[mode][field];
    }
  }
  result.textScale = numberInRange(source.textScale, 85, 125, 100);
  result.radiusScale = numberInRange(source.radiusScale, 50, 150, 100);
  result.spacing = numberInRange(source.spacing, 3, 6, 4);
  result.density = ['comfortable', 'compact'].includes(source.density) ? source.density : 'comfortable';
  result.motion = ['system', 'reduced'].includes(source.motion) ? source.motion : 'system';
  return result;
}

export function readAppearance() {
  try {
    const raw = persistentStorage.getItem(APPEARANCE_KEY);
    return normalizeAppearance(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeAppearance(null);
  }
}

export function applyAppearance(input, theme = 'light') {
  const value = normalizeAppearance(input);
  if (typeof document === 'undefined') return value;
  const root = document.documentElement;
  const palette = value[theme === 'dark' ? 'dark' : 'light'];
  const variables = {
    '--brand-primary': palette.primary,
    '--brand-primary-hover': `color-mix(in srgb, ${palette.primary} 85%, ${theme === 'dark' ? 'white' : 'black'})`,
    '--brand-primary-active': `color-mix(in srgb, ${palette.primary} 72%, ${theme === 'dark' ? 'white' : 'black'})`,
    '--brand-primary-soft': `color-mix(in srgb, ${palette.primary} 12%, transparent)`,
    '--brand-primary-glow': `color-mix(in srgb, ${palette.primary} 18%, transparent)`,
    '--border-focus': palette.primary,
    '--text-on-brand': palette.onPrimary,
    '--surface-page': palette.page,
    '--surface-card': palette.card,
    '--text-primary': palette.text,
    '--space-unit': `${value.spacing}px`,
  };
  for (const [name, size] of Object.entries(SIZES)) variables[`--product-text-${name}`] = `${size * value.textScale / 100}px`;
  for (const [name, radius] of Object.entries(RADII)) variables[`--product-radius-${name}`] = `${radius * value.radiusScale / 100}px`;
  for (const [name, css] of Object.entries(variables)) root.style.setProperty(name, css);
  root.dataset.density = value.density;
  root.dataset.appearanceMotion = value.motion;
  return value;
}

export function saveAppearance(input, theme = 'light') {
  const value = normalizeAppearance(input);
  persistentStorage.setItem(APPEARANCE_KEY, JSON.stringify(value));
  applyAppearance(value, theme);
  return value;
}

export function resetAppearance() {
  persistentStorage.removeItem(APPEARANCE_KEY);
  return applyAppearance(APPEARANCE_DEFAULTS, theme);
}

/** Contrast guidance is advisory; it must not silently modify a user's palette. */
export function contrastRatio(a, b) {
  const luminance = hex => {
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = rgb.map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return r * .2126 + g * .7152 + bl * .0722;
  };
  if (!HEX.test(a) || !HEX.test(b)) return 0;
  const [x, y] = [luminance(a), luminance(b)].sort((first, second) => second - first);
  return (x + .05) / (y + .05);
}
