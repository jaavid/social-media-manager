/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import type { ReactNode, Ref } from 'react';
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
  | 'partial'
  | 'unavailable'
  | 'not-found'
  | 'stale';

interface DataStateProps {
  state: DataStateKind;
  title: ReactNode;
  description?: ReactNode;
  referenceId?: string;
  focusRef?: Ref<HTMLDivElement>;
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
  unavailable: CloudOff,
  'not-found': SearchX,
  stale: AlertTriangle,
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
  referenceId,
  focusRef,
  action,
  children,
  icon,
  compact = false,
  className,
}: DataStateProps) {
  const Icon = icon ?? icons[state];
  const preservesContent = Boolean(children) && ['refreshing', 'offline', 'partial', 'stale', 'unavailable'].includes(state);
  const isBusy = state === 'loading' || state === 'refreshing';
  const isError = state === 'error' || state === 'forbidden' || state === 'not-found';

  const notice = (
    <div
      ref={focusRef}
      tabIndex={focusRef ? -1 : undefined}
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
        {referenceId && /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(referenceId) && <bdi className="mt-2 block text-xs">{referenceId}</bdi>}
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
