import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';

const VARIANT_CLASSES = {
  default: 'border-[var(--border-subtle)] bg-muted text-[var(--text-secondary)]',
  success: 'border-transparent bg-[var(--success-bg)] text-[var(--success)]',
  warning: 'border-transparent bg-[var(--warning-bg)] text-[var(--warning)]',
  danger: 'border-transparent bg-[var(--danger-bg)] text-[var(--danger)]',
  info: 'border-transparent bg-[var(--info-bg)] text-[var(--info)]',
  brand: 'border-transparent bg-[var(--brand-primary-glow)] text-[var(--brand-primary-hover)]',
  outline: 'border-border bg-transparent text-[var(--text-secondary)]',
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-px text-[10px]',
  md: 'px-2 py-0.5 text-[11px]',
};

const DOT_CLASSES = {
  sm: 'size-[5px]',
  md: 'size-1.5',
};

const ICON_SIZES = { sm: 10, md: 11 };

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  icon: Icon,
  children,
  className,
  style,
  ...rest
}) {
  const { tr } = useLanguage();
  const resolvedSize = SIZE_CLASSES[size] ? size : 'md';
  const localizedChildren = typeof children === 'string' ? tr(children) : children;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium leading-[1.4] tracking-[0.1px]',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.default,
        SIZE_CLASSES[resolvedSize],
        className,
      )}
      style={style}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          className={cn('shrink-0 rounded-full bg-current', DOT_CLASSES[resolvedSize])}
        />
      )}
      {Icon && <Icon size={ICON_SIZES[resolvedSize]} strokeWidth={2.4} aria-hidden />}
      {localizedChildren}
    </span>
  );
}
