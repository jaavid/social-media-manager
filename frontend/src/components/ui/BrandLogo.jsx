/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
const BRAND_ACCESSIBLE_NAME = 'Ravinta';
/** Ravinta logo renderers. The geometry mirrors the brand SVG master. */

function MarkSvg({ size = 40, inverted = false, decorative = false, monochrome }) {
  return (
    <svg
      width={Math.max(24, size)}
      height={Math.max(24, size)}
      viewBox="0 0 96 96"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : BRAND_ACCESSIBLE_NAME}
      aria-hidden={decorative || undefined}
      style={{ display: 'block', flexShrink: 0, transform: 'none', direction: 'ltr' }}
    >
      <g fill={monochrome || (inverted ? 'var(--brand-signal, #D6F268)' : 'var(--brand-primary, #123D3A)')}>
        <rect x="12" y="18" width="56" height="12" rx="6" />
        <rect x="12" y="42" width="72" height="12" rx="6" />
        <rect x="12" y="66" width="56" height="12" rx="6" />
      </g>
    </svg>
  );
}

function Wordmark({ height = 22, color = 'currentColor', decorative = false }) {
  return (
    <span
      lang="en"
      dir="ltr"
      data-wordmark-status="text-fallback"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : BRAND_ACCESSIBLE_NAME}
      aria-hidden={decorative || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-product-latin, "Noto Sans"), sans-serif',
        fontWeight: 800,
        fontSize: Math.round(height * 0.86),
        letterSpacing: '0.08em',
        lineHeight: 1.2,
        direction: 'ltr',
        color,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      RAVINTA
    </span>
  );
}

export function BrandMark({ size = 40, className, style, monochrome }) {
  return <span className={className} style={{ display: 'inline-flex', ...style }}><MarkSvg size={size} monochrome={monochrome} /></span>;
}

export function BrandMarkInverted({ size = 40, className, style }) {
  return <span className={className} style={{ display: 'inline-flex', ...style }}><MarkSvg size={size} inverted /></span>;
}

export function BrandWordmark({ height = 22, className, style }) {
  return <span className={className} style={{ display: 'inline-flex', minHeight: height, ...style }}><Wordmark height={height} /></span>;
}

export function BrandLogoHorizontal({ height = 36, className, style, inverted = false }) {
  return (
    <span role="img" aria-label={BRAND_ACCESSIBLE_NAME} className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(height * 0.32), minHeight: height, direction: 'ltr', ...style }}>
      <MarkSvg size={Math.round(height)} decorative inverted={inverted} />
      {height >= 32 && <Wordmark height={Math.round(height * 0.7)} decorative color={inverted ? 'var(--brand-signal)' : 'currentColor'} />}
    </span>
  );
}

export function BrandLogoStacked({ height = 100, className, style }) {
  return (
    <span role="img" aria-label={BRAND_ACCESSIBLE_NAME} className={className} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(height * 0.12), minHeight: height, direction: 'ltr', ...style }}>
      <MarkSvg size={Math.round(height * 0.6)} decorative />
      {height >= 80 && <Wordmark height={Math.round(height * 0.22)} decorative />}
    </span>
  );
}
