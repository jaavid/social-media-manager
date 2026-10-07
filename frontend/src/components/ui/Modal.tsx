/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n';
export interface DialogProps {
  open: boolean;
  role?: 'dialog' | 'alertdialog';
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  showClose?: boolean;
}
export default function Modal({
  open,
  role = 'dialog',
  initialFocusRef,
  returnFocusRef,
  onClose,
  title,
  description,
  ariaLabel,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  showClose = true,
}: DialogProps) {
  const { tr, isPersian } = useLanguage();
  const previousFocus = useRef<HTMLElement | null>(null);
  const initialFocusFrame = useRef<number | null>(null);
  useEffect(() => () => {
    if (initialFocusFrame.current !== null) cancelAnimationFrame(initialFocusFrame.current);
  }, [open]);
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
          role={role}
          onOpenAutoFocus={(event) => {
            previousFocus.current =
              document.activeElement as HTMLElement | null;
            if (initialFocusRef?.current) {
              event.preventDefault();
              const target = initialFocusRef.current;
            if (role === 'alertdialog') {
              // Let Radix register the nested dismissal layer before exposing its
              // focused Cancel control to an immediate Escape key.
              initialFocusFrame.current = requestAnimationFrame(() => {
                if (target.isConnected) target.focus();
              });
            } else target.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (returnFocusRef?.current || previousFocus.current)?.focus();
          }}
          dir={isPersian ? 'rtl' : 'ltr'}
          {...(!description ? { 'aria-describedby': undefined } : {})}
          onPointerDownOutside={(e) => {
            if (!closeOnBackdrop) e.preventDefault();
          }}
          className={cn('ds-dialog', {
            'max-w-[420px]': size === 'sm',
            'max-w-[560px]': size === 'md',
            'max-w-[760px]': size === 'lg',
            'max-w-[960px]': size === 'xl',
          })}
        >
          <div className="ds-dialog-heading">
            <DialogPrimitive.Title
              className={cn('text-lg font-semibold', !title && 'sr-only')}
            >
              {title || ariaLabel || tr('Dialog')}
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
