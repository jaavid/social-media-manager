/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { forwardRef, useId, useEffect, useRef, useState } from 'react';
import type {
  ComponentType,
  CSSProperties,
  ReactNode,
  KeyboardEvent,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n';
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: ComponentType<{ size?: number }>;
}
export interface SelectProps {
  options?: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  searchable?: boolean;
  placement?: 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
}
const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options = [],
    value,
    onChange,
    label,
    hint,
    error,
    placeholder = 'Select…',
    searchable = false,
    placement = 'bottom',
    size = 'md',
    disabled,
    fullWidth = true,
    id,
    className,
    style,
    ...aria
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const filtered = options.filter(
    (o) => !query || tr(o.label).toLowerCase().includes(query.toLowerCase()),
  );
  const enabled = filtered
    .map((o, i) => (o.disabled ? -1 : i))
    .filter((i) => i >= 0);
  const selected = options.find((o) => o.value === value);
  const message = error || hint;
  const localize = (v: ReactNode) => (typeof v === 'string' ? tr(v) : v);
  function close(restore = false) {
    setOpen(false);
    setQuery('');
    setActive(-1);
    if (restore) trigger.current?.focus();
  }
  function show() {
    setOpen(true);
    setActive(options.findIndex((o) => o.value === value && !o.disabled));
  }
  useEffect(() => {
    if (!open) return;
    if (searchable) search.current?.focus();
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, searchable]);
  function keyDown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      close();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      show();
      return;
    }
    if (!open) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const index = enabled.indexOf(active);
      const next =
        e.key === 'Home'
          ? enabled[0]
          : e.key === 'End'
            ? enabled[enabled.length - 1]
            : enabled[
                (index + (e.key === 'ArrowDown' ? 1 : -1) + enabled.length) %
                  enabled.length
              ];
      setActive(next ?? -1);
    } else if (
      e.key === 'Enter' ||
      (e.key === ' ' && e.target === trigger.current)
    ) {
      e.preventDefault();
      const option = filtered[active];
      if (option && !option.disabled) {
        onChange?.(option.value);
        close(true);
      }
    }
  }
  const activeDescendant =
    open && active >= 0 ? `${fieldId}-option-${active}` : undefined;
  return (
    <div
      ref={root}
      className={cn('relative min-w-0', fullWidth && 'w-full', className)}
      style={style}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      {label && (
        <label className="ds-field-label" htmlFor={fieldId}>
          {localize(label)}
        </label>
      )}
      <button
        {...aria}
        ref={(node) => {
          trigger.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        id={fieldId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${fieldId}-list` : undefined}
        aria-activedescendant={!searchable ? activeDescendant : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [aria['aria-describedby'], message ? `${fieldId}-message` : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        disabled={disabled}
        onKeyDown={keyDown}
        onClick={() => (open ? close() : show())}
        className={cn(
          'ds-input-frame w-full gap-2 px-3 text-start',
          error && 'ds-field-invalid',
          size === 'lg' && 'min-h-12',
        )}
      >
        {selected?.icon && <selected.icon size={16} />}
        <span className="min-w-0 flex-1 truncate">
          {selected ? tr(selected.label) : tr(placeholder)}
        </span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open && (
        <div
          className={cn(
            'ds-select-popup',
            placement === 'top' && 'ds-select-popup-top',
          )}
          onKeyDown={keyDown}
        >
          {searchable && (
            <input
              ref={search}
              role="combobox"
              aria-label={tr('Search…')}
              aria-expanded={true}
              aria-controls={`${fieldId}-list`}
              aria-activedescendant={activeDescendant}
              className="ds-textarea mb-1 min-h-11"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              placeholder={tr('Search…')}
            />
          )}
          <div
            id={`${fieldId}-list`}
            role="listbox"
            aria-label={
              typeof label === 'string'
                ? tr(label)
                : aria['aria-label'] || tr(placeholder)
            }
          >
            {filtered.map((o, i) => (
              <div
                id={`${fieldId}-option-${i}`}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled}
                key={o.value}
                onPointerDown={(e) => e.preventDefault()}
                onPointerMove={() => {
                  if (!o.disabled) setActive(i);
                }}
                onClick={() => {
                  if (!o.disabled) {
                    onChange?.(o.value);
                    close(true);
                  }
                }}
                className={cn(
                  'ds-select-option',
                  active === i && 'bg-accent',
                  o.disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {o.icon && <o.icon size={16} />}
                <span className="flex-1">{tr(o.label)}</span>
                {o.value === value && <Check size={16} aria-hidden />}
              </div>
            ))}
            {!filtered.length && (
              <div className="p-3 text-sm text-muted-foreground">
                {tr('No options')}
              </div>
            )}
          </div>
        </div>
      )}
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
export default Select;
