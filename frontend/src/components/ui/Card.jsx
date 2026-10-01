import { forwardRef } from 'react';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';

const PADDING_CLASSES = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

const Card = forwardRef(function Card(
  {
    padding = 'md',
    interactive = false,
    elevated = false,
    glass = false,
    as: Component = 'div',
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const resolvedPadding = PADDING_CLASSES[padding] || PADDING_CLASSES.md;

  return (
    <Component
      ref={ref}
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border-subtle)] transition-[background-color,border-color,box-shadow,transform] duration-200',
        glass
          ? 'bg-[var(--surface-glass)] backdrop-blur-[14px] backdrop-saturate-[180%]'
          : 'bg-card',
        elevated
          ? glass ? 'shadow-lg' : 'shadow-md'
          : glass ? 'shadow-md' : 'shadow-sm',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:border-border hover:shadow-md',
        resolvedPadding,
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </Component>
  );
});

function CardHeader({ title, subtitle, action, className, style, children, ...rest }) {
  const { tr } = useLanguage();
  const localizedTitle = typeof title === 'string' ? tr(title) : title;
  const localizedSubtitle = typeof subtitle === 'string' ? tr(subtitle) : subtitle;

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3',
        (title || subtitle) && 'mb-3',
        className,
      )}
      style={style}
      {...rest}
    >
      <div className="min-w-0">
        {localizedTitle && (
          <h3 className="m-0 text-base font-semibold tracking-[-0.01em] text-foreground">
            {localizedTitle}
          </h3>
        )}
        {localizedSubtitle && (
          <div className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
            {localizedSubtitle}
          </div>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function CardBody({ children, className, style, ...rest }) {
  return (
    <div className={className} style={style} {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ children, className, style, ...rest }) {
  return (
    <div
      className={cn(
        'mt-4 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4',
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
