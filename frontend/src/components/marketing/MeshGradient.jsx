'use client';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * MeshGradient — animated multi-blob backdrop for hero + CTA sections.
 *
 * Pure CSS — three radial-gradient blobs drift slowly via @keyframes.
 * GPU-friendly (translate-only, no layout thrash). Honours
 * `prefers-reduced-motion` by halting the drift but keeping the static blobs.
 *
 *   <MeshGradient variant="hero" />
 *
 * Variants:
 *   - 'hero'   cyan → purple, vibrant (dark sections)
 *   - 'soft'   muted, for light sections
 *   - 'cta'    saturated for the final CTA
 */
export default function MeshGradient({ variant = 'hero', className, style }) {
  const palettes = {
    hero: {
      bg: 'var(--marketing-hero-surface)',
      blobs: [
        { color: 'color-mix(in srgb, var(--brand-primary) 50%, transparent)', x: '15%',  y: '20%',  size: 520 },
        { color: 'color-mix(in srgb, var(--module-ai) 36%, transparent)', x: '78%',  y: '25%',  size: 460 },
        { color: 'color-mix(in srgb, var(--brand-primary-hover) 32%, transparent)',  x: '45%',  y: '85%',  size: 600 },
      ],
    },
    soft: {
      bg: 'transparent',
      blobs: [
        { color: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)', x: '20%',  y: '15%',  size: 500 },
        { color: 'color-mix(in srgb, var(--module-ai) 12%, transparent)', x: '80%',  y: '70%',  size: 480 },
      ],
    },
    cta: {
      bg: 'var(--marketing-hero-surface)',
      blobs: [
        { color: 'color-mix(in srgb, var(--brand-primary) 55%, transparent)',  x: '20%',  y: '50%',  size: 560 },
        { color: 'color-mix(in srgb, var(--module-ai) 42%, transparent)', x: '80%',  y: '40%',  size: 520 },
        { color: 'color-mix(in srgb, var(--module-ads) 18%, transparent)', x: '50%',  y: '90%',  size: 480 },
      ],
    },
  };
  const p = palettes[variant] || palettes.hero;

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: p.bg,
        ...style,
      }}
    >
      {p.blobs.map((b, i) => (
        <div
          key={i}
          className="mkt-mesh-blob"
          style={{
            position: 'absolute',
            top: `calc(${b.y} - ${b.size / 2}px)`,
            left: `calc(${b.x} - ${b.size / 2}px)`,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at center, ${b.color}, transparent 70%)`,
            filter: 'blur(40px)',
            animation: `mkt-mesh-drift-${i % 3} ${22 + i * 4}s ease-in-out infinite`,
            willChange: 'transform',
          }}
        />
      ))}
      {/* Faint dotted grid overlay for tech feel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(color-mix(in srgb, var(--border-default) 35%, transparent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: variant === 'soft' ? 0 : 0.6,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />
    </div>
  );
}
