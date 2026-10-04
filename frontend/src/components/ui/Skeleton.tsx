/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'text' | 'card' | 'avatar' | 'image' | 'rect';
  width?: number | string;
  height?: number | string;
  lines?: number;
  radius?: number | string;
}
const defaults = {
  text: [12, 'var(--radius-sm)'],
  card: [120, 'var(--radius-lg)'],
  avatar: [40, '50%'],
  image: [200, 'var(--radius-md)'],
  rect: [16, 'var(--radius-sm)'],
} as const;
export default function Skeleton({
  variant = 'rect',
  width,
  height,
  lines = 1,
  radius,
  className,
  style,
  ...props
}: SkeletonProps) {
  const dimensions: CSSProperties = {
    width: width ?? (variant === 'avatar' ? 40 : '100%'),
    height: height ?? defaults[variant][0],
    borderRadius: radius ?? defaults[variant][1],
    ...style,
  };
  if (variant === 'text' && lines > 1)
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="ds-skeleton"
            style={{
              ...dimensions,
              width: i === lines - 1 ? '70%' : dimensions.width,
            }}
          />
        ))}
      </div>
    );
  return (
    <span
      {...props}
      aria-hidden
      className={cn('ds-skeleton', className)}
      style={dimensions}
    />
  );
}
