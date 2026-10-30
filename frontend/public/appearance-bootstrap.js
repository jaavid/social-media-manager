/* Same-origin, render-blocking appearance restoration before first paint. */
(() => {
  try {
    const raw = localStorage.getItem('ravinta.appearance.v1');
    if (!raw) return;
    const source = JSON.parse(raw);
    if (!source || typeof source !== 'object' || Array.isArray(source)) return;
    const root = document.documentElement;
    const mode = root.dataset.theme === 'dark' ? 'dark' : 'light';
    const palette = source[mode] || {};
    const names = { primary: '--brand-primary', onPrimary: '--text-on-brand',
      page: '--surface-page', card: '--surface-card', text: '--text-primary' };
    const valid = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    for (const [field, token] of Object.entries(names))
      if (valid(palette[field])) root.style.setProperty(token, palette[field]);
    if (valid(palette.primary)) {
      const primary = palette.primary;
      root.style.setProperty('--brand-primary-hover', `color-mix(in srgb, ${primary} 85%, ${mode === 'dark' ? 'white' : 'black'})`);
      root.style.setProperty('--brand-primary-active', `color-mix(in srgb, ${primary} 72%, ${mode === 'dark' ? 'white' : 'black'})`);
      root.style.setProperty('--brand-primary-soft', `color-mix(in srgb, ${primary} 12%, transparent)`);
      root.style.setProperty('--brand-primary-glow', `color-mix(in srgb, ${primary} 18%, transparent)`);
      root.style.setProperty('--border-focus', primary);
    }
    const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
    if (integer(source.spacing, 3, 6)) root.style.setProperty('--space-unit', `${source.spacing}px`);
    if (integer(source.textScale, 85, 125)) {
      for (const [name, size] of Object.entries({ xs:11, sm:13, base:14, md:15, lg:16, xl:18,
        '2xl':22, '3xl':28, '4xl':36, '5xl':48, '6xl':60, '7xl':72 }))
        root.style.setProperty(`--product-text-${name}`, `${size * source.textScale / 100}px`);
    }
    if (integer(source.radiusScale, 50, 150))
      for (const [name, size] of Object.entries({ xs:4, sm:6, md:10, lg:14, xl:20, '2xl':28 }))
        root.style.setProperty(`--product-radius-${name}`, `${size * source.radiusScale / 100}px`);
    root.dataset.density = source.density === 'compact' ? 'compact' : 'comfortable';
    root.dataset.appearanceMotion = source.motion === 'reduced' ? 'reduced' : 'system';
  } catch (_) { /* Storage may be unavailable; canonical CSS remains authoritative. */ }
})();
