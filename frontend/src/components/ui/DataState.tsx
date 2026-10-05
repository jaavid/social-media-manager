/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Ban,
  CircleSlash2,
  CloudOff,
  Inbox,
  Loader2,
  SearchX,
} from 'lucide-react';

import { cn } from '../../lib/utils';

export type DataStateKind =
  | 'loading'
  | 'refreshing'
  | 'empty'
  | 'no-results'
  | 'error'
  | 'offline'
  | 'forbidden'
  | 'partial';

interface DataStateProps {
  state: DataStateKind;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
}

const icons: Record<DataStateKind, DataStateProps['icon']> = {
  loading: Loader2,
  refreshing: Loader2,
  empty: Inbox,
  'no-results': SearchX,
  error: AlertTriangle,
  offline: CloudOff,
  forbidden: Ban,
  partial: CircleSlash2,
};

/**
 * The shared data-state contract. Refresh, offline and partial states retain
 * already-rendered data; terminal states replace the content with one clear
 * explanation and recovery action.
 */
export default function DataState({
  state,
  title,
  description,
  action,
  children,
  icon,
  compact = false,
  className,
}: DataStateProps) {
  const Icon = icon ?? icons[state];
  const preservesContent = Boolean(children) && ['refreshing', 'offline', 'partial'].includes(state);
  const isBusy = state === 'loading' || state === 'refreshing';
  const isError = state === 'error' || state === 'forbidden';

  const notice = (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-busy={isBusy || undefined}
      data-data-state={state}
      className={cn(
        'flex min-w-0 gap-3 text-start',
        preservesContent
          ? 'items-start rounded-xl border border-border bg-card p-3 shadow-xs'
          : 'flex-col items-center justify-center text-center',
        !preservesContent && (compact ? 'px-4 py-6' : 'px-6 py-12'),
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-[var(--text-secondary)]',
            isBusy && 'text-primary',
            isError && 'bg-[var(--danger-bg)] text-[var(--danger)]',
          )}
        >
          <Icon size={22} className={cn(isBusy && 'motion-safe:animate-spin')} aria-hidden />
        </span>
      )}
      <span className={cn('min-w-0', !preservesContent && 'max-w-md')}>
        <span className="block text-base font-semibold text-foreground">{title}</span>
        {description && (
          <span className="mt-1 block text-sm leading-relaxed text-[var(--text-secondary)]">
            {description}
          </span>
        )}
        {action && <span className="mt-3 flex flex-wrap gap-2">{action}</span>}
      </span>
    </div>
  );

  if (!preservesContent) return notice;
  return (
    <div className="space-y-3" aria-busy={isBusy || undefined}>
      {notice}
      {children}
    </div>
  );
}
