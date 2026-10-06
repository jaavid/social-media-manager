/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { AlertTriangle, RefreshCw } from 'lucide-react';

import Button from './Button';
import DataState from './DataState';
import { useLanguage } from '@/i18n';

/**
 * ErrorState — companion to EmptyState for failed loads.
 *
 * Props:
 *   icon:        Lucide icon component  (default AlertTriangle)
 *   title:       headline
 *   description: secondary copy
 *   onRetry:     when set, renders a "Try again" button
 *   retryLabel:  override button copy
 *   action:      override the entire CTA (renders instead of retry button)
 *   compact:     reduce padding for inline use
 */
export default function ErrorState({
  icon: Icon = AlertTriangle,
  title = 'Something went wrong',
  description = "We couldn't load this just now. Please try again.",
  onRetry,
  retryLabel = 'Try again',
  action,
  compact = false,
  style,
  ...rest
}) {
  const { tr } = useLanguage();
  return (
    <div style={style} {...rest}>
      <DataState
        state="error"
        icon={Icon}
        title={tr(title)}
        description={tr(description)}
        compact={compact}
        action={
          action ||
          (onRetry && (
            <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
              {tr(retryLabel)}
            </Button>
          ))
        }
      />
    </div>
  );
}
