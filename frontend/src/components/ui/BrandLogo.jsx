/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/** Ravinta logo renderers. The geometry mirrors the brand SVG master. */

function MarkSvg({ size = 40, inverted = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Ravinta"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <g fill={inverted ? '#D6F268' : 'var(--brand-primary, #123D3A)'}>
        <rect x="12" y="18" width="56" height="12" rx="6" />
        <rect x="12" y="42" width="72" height="12" rx="6" />
        <rect x="12" y="66" width="56" height="12" rx="6" />
      </g>
    </svg>
  );
}

function Wordmark({ height = 22, color = 'currentColor' }) {
  return (
    <span
      role="img"
      aria-label="Ravinta"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-product-latin, "Noto Sans"), sans-serif',
        fontWeight: 800,
        fontSize: Math.round(height * 0.86),
        letterSpacing: '0.08em',
        lineHeight: 1,
        color,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      RAVINTA
    </span>
  );
}

export function BrandMark({ size = 40, className, style }) {
  return <span className={className} style={{ display: 'inline-flex', ...style }}><MarkSvg size={size} /></span>;
}

export function BrandMarkInverted({ size = 40, className, style }) {
  return <span className={className} style={{ display: 'inline-flex', ...style }}><MarkSvg size={size} inverted /></span>;
}

export function BrandWordmark({ height = 22, className, style }) {
  return <span className={className} style={{ display: 'inline-flex', height, ...style }}><Wordmark height={height} /></span>;
}

export function BrandLogoHorizontal({ height = 36, className, style }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(height * 0.32), height, ...style }}>
      <MarkSvg size={Math.round(height)} />
      <Wordmark height={Math.round(height * 0.7)} />
    </span>
  );
}

export function BrandLogoStacked({ height = 100, className, style }) {
  return (
    <span className={className} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(height * 0.12), height, ...style }}>
      <MarkSvg size={Math.round(height * 0.6)} />
      <Wordmark height={Math.round(height * 0.22)} />
    </span>
  );
}
