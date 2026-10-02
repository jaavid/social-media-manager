/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff, Search, Check } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  success?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
}
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    success,
    prefix,
    suffix,
    size = 'md',
    fullWidth = true,
    showPasswordToggle = true,
    type = 'text',
    id,
    className,
    style,
    'aria-describedby': describedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const [revealed, setRevealed] = useState(false);
  const { tr } = useLanguage();
  const localize = (v: ReactNode) => (typeof v === 'string' ? tr(v) : v);
  const message = error || hint;
  const password = type === 'password';
  return (
    <div
      className={cn('min-w-0', fullWidth && 'w-full', className)}
      style={style}
    >
      {label && (
        <label className="ds-field-label" htmlFor={fieldId}>
          {localize(label)}
        </label>
      )}
      <div
        className={cn(
          'ds-input-frame',
          error && 'ds-field-invalid',
          size === 'lg' && 'min-h-12',
        )}
      >
        {(prefix || type === 'search') && (
          <span className="ps-3 text-muted-foreground" aria-hidden>
            {type === 'search' ? <Search size={16} /> : prefix}
          </span>
        )}
        <input
          {...props}
          ref={ref}
          id={fieldId}
          type={password && revealed ? 'text' : type}
          placeholder={props.placeholder ? tr(props.placeholder) : undefined}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={
            [describedBy, message ? `${fieldId}-message` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={cn('ds-input-control', size === 'sm' && 'text-sm')}
        />
        {success && !error && (
          <Check size={16} className="me-3 text-[var(--success)]" aria-hidden />
        )}
        {password && showPasswordToggle ? (
          <button
            type="button"
            className="ds-icon-button"
            aria-pressed={revealed}
            aria-label={tr(revealed ? 'Hide password' : 'Show password')}
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : (
          suffix && <span className="pe-3">{suffix}</span>
        )}
      </div>
      {message && (
        <div
          id={`${fieldId}-message`}
          className={cn('ds-field-message', error && 'text-destructive')}
          role={error ? 'alert' : undefined}
        >
          {localize(message)}
        </div>
      )}
    </div>
  );
});
export default Input;
