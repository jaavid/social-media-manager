/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useRef } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode, CSSProperties, RefObject } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n';
export interface SheetProps {
  open: boolean;
  onClose?: () => void;
  returnFocusRef?: RefObject<HTMLElement>;
  side?: 'left' | 'right' | 'top' | 'bottom' | 'start' | 'end';
  width?: number | string;
  height?: number | string;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  showClose?: boolean;
}
export default function Drawer({
  open,
  onClose,
  returnFocusRef,
  side = 'end',
  width = 420,
  height = 360,
  title,
  description,
  children,
  footer,
  showClose = true,
}: SheetProps) {
  const { tr, isPersian } = useLanguage();
  const previousFocus = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const position =
    side === 'left'
      ? isPersian
        ? 'end'
        : 'start'
      : side === 'right'
        ? isPersian
          ? 'start'
          : 'end'
        : side;
  const horizontal = position === 'start' || position === 'end';
  const dimensions = {
    '--sheet-size':
      typeof (horizontal ? width : height) === 'number'
        ? `${horizontal ? width : height}px`
        : horizontal
          ? width
          : height,
  } as CSSProperties;
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ds-overlay" />
        <DialogPrimitive.Content
          ref={contentRef}
          onEscapeKeyDown={(event) => {
            if (event.target instanceof Node && !contentRef.current?.contains(event.target)) event.preventDefault();
          }}
          onOpenAutoFocus={() => {
            previousFocus.current =
              document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (returnFocusRef?.current || previousFocus.current)?.focus();
          }}
          dir={isPersian ? 'rtl' : 'ltr'}
          className={cn('ds-sheet', `ds-sheet-${position}`)}
          style={dimensions}
          {...(!description ? { 'aria-describedby': undefined } : {})}
        >
          <div className="ds-dialog-heading">
            <DialogPrimitive.Title
              className={cn('text-lg font-semibold', !title && 'sr-only')}
            >
              {title || tr('Navigation')}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
            {showClose && (
              <DialogPrimitive.Close
                className="ds-dialog-close ds-icon-button"
                aria-label={tr('Close dialog')}
              >
                <X size={18} />
              </DialogPrimitive.Close>
            )}
          </div>
          <div className="ds-dialog-body">{children}</div>
          {footer && <div className="ds-dialog-footer">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
