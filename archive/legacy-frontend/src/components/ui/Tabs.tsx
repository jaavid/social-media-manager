/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import * as Primitive from '@radix-ui/react-tabs';
import type { CSSProperties, ReactNode, ComponentType } from 'react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n';
export interface TabOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  badge?: number;
  icon?: ComponentType<{ size?: number }>;
}
export default function Tabs({
  tabs = [],
  value,
  onChange,
  variant = 'pill',
  size = 'md',
  fullWidth,
  ariaLabel,
  style,
  className,
  children,
}: {
  children?: ReactNode;
  tabs?: TabOption[];
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'pill' | 'underline';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const { tr, isPersian } = useLanguage();
  return (
    <Primitive.Root
      value={value}
      onValueChange={onChange}
      dir={isPersian ? 'rtl' : 'ltr'}
      className={cn('min-w-0', fullWidth && 'w-full', className)}
      style={style}
    >
      <Primitive.List
        aria-label={ariaLabel}
        className={cn(
          'ds-tabs',
          variant === 'underline' && 'ds-tabs-underline',
          fullWidth && 'w-full',
        )}
      >
        {tabs.map((tab) => (
          <Primitive.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            {...(!children ? { 'aria-controls': undefined } : {})}
            className={cn(
              'ds-tab',
              fullWidth && 'flex-1',
              size === 'sm' && 'text-xs',
            )}
          >
            {tab.icon && <tab.icon size={16} />}
            {typeof tab.label === 'string' ? tr(tab.label) : tab.label}
            {!!tab.badge && (
              <span className="rounded-full bg-secondary px-1.5 text-xs tabular-nums">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </Primitive.Trigger>
        ))}
      </Primitive.List>
      {children}
    </Primitive.Root>
  );
}
export const TabPanel = Primitive.Content;
