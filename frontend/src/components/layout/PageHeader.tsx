/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import type { ReactNode } from 'react';
import { useAppNavigate } from '../../core/navigation';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';
interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  meta?: ReactNode[];
  eyebrow?: ReactNode;
}
export default function PageHeader({
  title,
  subtitle,
  action,
  actions,
  backHref,
  meta = [],
  eyebrow,
}: PageHeaderProps) {
  const navigate = useAppNavigate();
  const { tr, isPersian } = useLanguage();
  const localize = (v: ReactNode) => (typeof v === 'string' ? tr(v) : v);
  return (
    <div
      className={cn(
        'page-header-sticky flex min-w-0 flex-wrap items-start justify-between gap-4',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {backHref && (
          <button
            type="button"
            className="ds-icon-button border border-border bg-card"
            onClick={() => navigate(backHref)}
            aria-label={tr('Back')}
          >
            <ChevronLeft size={16} className={cn(isPersian && 'rotate-180')} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-1.5 text-xs font-semibold text-[var(--brand-primary-hover)]">
              {localize(eyebrow)}
            </div>
          )}
          <h1 className="m-0 break-words text-[22px] font-semibold leading-snug text-foreground">
            {localize(title)}
          </h1>
          {subtitle && (
            <p className="mb-0 mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {localize(subtitle)}
            </p>
          )}
          {!!meta.length && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {meta.map((item, index) => (
                <span key={index}>{localize(item)}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {(action || actions) && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
          {action || actions}
        </div>
      )}
    </div>
  );
}
