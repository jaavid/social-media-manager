/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  className,
  ...rest
}) {
  if (variant === 'inline') {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary-hover)]", className)}
        style={style}
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
        className={cn("inline-flex items-center gap-2", className)}
        style={style}
        {...rest}
      >
        <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--text-on-brand)]">
          <Sparkles size={12} strokeWidth={2.4} />
        </span>
        <span className="inline-flex h-[14px] items-end gap-[3px]">
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
      className={cn("relative overflow-hidden rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]", className)}
      style={{ width, height, ...style }}
      {...rest}
    >
      <span className="ai-loading-shimmer" />

    </div>
  );
}

