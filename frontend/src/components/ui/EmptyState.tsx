/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n';
interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
  className,
  ...props
}: EmptyStateProps) {
  const { tr } = useLanguage();
  const localize = (v: ReactNode) => (typeof v === 'string' ? tr(v) : v);
  return (
    <div
      {...props}
      role="status"
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-3 text-center text-[var(--text-secondary)]',
        compact ? 'px-4 py-6' : 'px-6 py-12',
        className,
      )}
    >
      {Icon && (
        <div
          aria-hidden
          className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"
        >
          <Icon size={24} />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">
        {localize(title)}
      </h3>
      {description && (
        <p className="max-w-md text-sm leading-relaxed">
          {localize(description)}
        </p>
      )}
      {action && (
        <div className="mt-2 flex max-w-full flex-wrap justify-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
