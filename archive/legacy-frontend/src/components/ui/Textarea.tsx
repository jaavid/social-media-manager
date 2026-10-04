/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { forwardRef, useId, useEffect, useRef, useState } from 'react';
import type { TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n';
export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  minRows?: number;
  maxRows?: number;
  showCount?: boolean;
  autoResize?: boolean;
}
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      hint,
      error,
      minRows = 3,
      maxRows = 12,
      showCount,
      autoResize = true,
      id,
      className,
      style,
      onChange,
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const fieldId = id || generatedId;
    const inner = useRef<HTMLTextAreaElement | null>(null);
    const [count, setCount] = useState(
      String(props.value ?? props.defaultValue ?? '').length,
    );
    const { tr } = useLanguage();
    const localize = (v: ReactNode) => (typeof v === 'string' ? tr(v) : v);
    useEffect(() => {
      if (!autoResize || !inner.current) return;
      const el = inner.current;
      el.style.height = 'auto';
      el.style.height = `${Math.min(maxRows * 24 + 20, Math.max(minRows * 24 + 20, el.scrollHeight))}px`;
      el.style.overflowY =
        el.scrollHeight > maxRows * 24 + 20 ? 'auto' : 'hidden';
    }, [props.value, count, autoResize, minRows, maxRows]);
    const message = error || hint;
    return (
      <div className={cn('w-full min-w-0', className)} style={style}>
        {label && (
          <label htmlFor={fieldId} className="ds-field-label">
            {localize(label)}
          </label>
        )}
        <textarea
          {...props}
          id={fieldId}
          rows={minRows}
          ref={(node) => {
            inner.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            'ds-textarea',
            error && 'ds-field-invalid',
            autoResize && 'resize-none',
          )}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={
            [describedBy, message ? `${fieldId}-message` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          placeholder={props.placeholder ? tr(props.placeholder) : undefined}
          onChange={(e) => {
            setCount(e.target.value.length);
            onChange?.(e);
          }}
        />
        <div className="flex justify-between gap-3 text-xs">
          {message && (
            <span
              id={`${fieldId}-message`}
              className={cn('ds-field-message', error && 'text-destructive')}
              role={error ? 'alert' : undefined}
            >
              {localize(message)}
            </span>
          )}
          {(showCount || props.maxLength != null) && (
            <span className="ms-auto mt-1 text-muted-foreground tabular-nums">
              {props.value != null ? String(props.value).length : count}
              {props.maxLength != null ? ` / ${props.maxLength}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  },
);
export default Textarea;
