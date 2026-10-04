/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import * as Primitive from '@radix-ui/react-tooltip';
import type { ReactElement, ReactNode } from 'react';
import { useLanguage } from '../../i18n';
export default function Tooltip({
  content,
  side = 'top',
  delay = 200,
  children,
  disabled = false,
}: {
  content?: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: ReactElement;
  disabled?: boolean;
}) {
  const { tr, isPersian } = useLanguage();
  if (disabled || !content) return children;
  return (
    <Primitive.Provider delayDuration={delay}>
      <Primitive.Root>
        <Primitive.Trigger asChild>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content
            dir={isPersian ? 'rtl' : 'ltr'}
            side={side}
            sideOffset={6}
            className="ds-tooltip"
          >
            {typeof content === 'string' ? tr(content) : content}
            <Primitive.Arrow className="fill-[var(--text-primary)]" />
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
