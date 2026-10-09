import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes, ReactNode } from 'react';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';
interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}
/** Native event/option compatibility for existing forms. Custom lists use Select. */
const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  function NativeSelect(
    {
      label,
      hint,
      error,
      id,
      className,
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) {
    const generated = useId();
    const fieldId = id || generated;
    const { tr } = useLanguage();
    const localize = (v: ReactNode) => (typeof v === 'string' ? tr(v) : v);
    return (
      <div className={cn('min-w-0 w-full', className)}>
        {label && (
          <label htmlFor={fieldId} className="ds-field-label">
            {localize(label)}
          </label>
        )}
        <div className="relative">
        <select
          {...props}
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={
            [describedBy, error || hint ? `${fieldId}-message` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="ds-native-select"
        />
        {!props.multiple && (!props.size || props.size === 1) && <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
        </div>
        {(error || hint) && (
          <div
            id={`${fieldId}-message`}
            className={cn('ds-field-message', error && 'text-destructive')}
            role={error ? 'alert' : undefined}
          >
            {localize(error || hint)}
          </div>
        )}
      </div>
    );
  },
);
export default NativeSelect;
