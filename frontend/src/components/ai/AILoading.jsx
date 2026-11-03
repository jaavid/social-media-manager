/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { Sparkles } from 'lucide-react';

/**
 * AILoading — the canonical "Ravinta is thinking…" shimmer used by every
 * AI surface that performs an async generation (chat, writer, insights, etc).
 *
 * Variants:
 *   variant: 'shimmer' (default) — a brand-gradient sweeping skeleton bar
 *            'dots'              — three pulsing dots beside a sparkle
 *            'inline'            — a small inline label "✨ Generating…"
 *
 * Props:
 *   label:    visible label (default "Ravinta is thinking…")
 *   height:   bar height in px (shimmer only) — default 18
 *   width:    bar width — default '100%'
 *
 * Honours `prefers-reduced-motion`: animation is replaced by a static fill.
 */
export default function AILoading({
  variant = 'shimmer',
  label = 'Ravinta is thinking…',
  height = 18,
  width = '100%',
  style,
  ...rest
}) {
  if (variant === 'inline') {
    return (
      <span
        role="status"
        aria-live="polite"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500,
          color: 'var(--brand-primary-hover)',
          ...style,
        }}
        {...rest}
      >
        <Sparkles size={11} strokeWidth={2.4} className="ai-loading-pulse" />
        {label}

      </span>
    );
  }

  if (variant === 'dots') {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label={label}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}
        {...rest}
      >
        <span style={{
          width: 22, height: 22,
          borderRadius: '50%',
          background: 'var(--brand-gradient)',
          color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={12} strokeWidth={2.4} />
        </span>
        <span style={{ display: 'inline-flex', gap: 3, alignItems: 'flex-end', height: 14 }}>
          {[0, 0.15, 0.3].map((d, i) => (
            <span
              key={i}
              className="ai-loading-dot"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </span>

      </span>
    );
  }

  // shimmer (default)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-sunken)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      <span className="ai-loading-shimmer" />

    </div>
  );
}

