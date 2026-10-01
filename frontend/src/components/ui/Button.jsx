import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';

const SIZE_CLASSES = {
  xs: 'h-6 px-2.5 text-[11px]',
  sm: 'h-7 px-3 text-xs',
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-11 px-[18px] text-sm',
  xl: 'h-[52px] px-[22px] text-[15px]',
};

const ICON_ONLY_CLASSES = {
  xs: 'size-6',
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-11',
  xl: 'size-[52px]',
};

const ICON_SIZES = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 };

const VARIANT_CLASSES = {
  primary:
    'border-transparent bg-[var(--brand-gradient)] text-[var(--text-on-brand)] shadow-sm hover:-translate-y-px hover:shadow-[var(--shadow-md),var(--shadow-glow)]',
  secondary:
    'border-border bg-card text-foreground shadow-sm hover:border-[var(--border-strong)] hover:bg-accent',
  ghost:
    'border-transparent bg-transparent text-[var(--text-secondary)] shadow-none hover:bg-accent hover:text-foreground',
  outline:
    'border-[var(--brand-primary)] bg-transparent text-[var(--brand-primary-hover)] shadow-none hover:border-[var(--brand-primary-hover)] hover:bg-[var(--brand-primary-soft)]',
  danger:
    'border-transparent bg-destructive text-white shadow-sm hover:bg-[#dc2626] hover:shadow-md',
  success:
    'border-transparent bg-[var(--success)] text-white shadow-sm hover:bg-[#059669] hover:shadow-md',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    iconOnly = false,
    loading = false,
    disabled = false,
    fullWidth = false,
    as: Component = 'button',
    type,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const { tr } = useLanguage();
  const localizedChildren = typeof children === 'string' ? tr(children) : children;
  const resolvedSize = SIZE_CLASSES[size] ? size : 'md';
  const isDisabled = disabled || loading;
  const nativeType = Component === 'button' ? (type || 'button') : type;
  const iconSize = ICON_SIZES[resolvedSize];

  return (
    <Component
      ref={ref}
      type={nativeType}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex min-h-0 min-w-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] border font-medium leading-none no-underline transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60',
        iconOnly ? ICON_ONLY_CLASSES[resolvedSize] : SIZE_CLASSES[resolvedSize],
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        fullWidth && 'w-full',
        className,
      )}
      style={style}
      {...rest}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" aria-hidden />
      ) : (
        Icon && <Icon size={iconSize} strokeWidth={2} aria-hidden />
      )}
      {!iconOnly && !loading && localizedChildren}
      {!iconOnly && !loading && IconRight && <IconRight size={iconSize} strokeWidth={2} aria-hidden />}
    </Component>
  );
});

export default Button;
