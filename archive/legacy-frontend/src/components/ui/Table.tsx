import { forwardRef } from 'react';
import type {
  HTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';
export const Table = forwardRef<
  HTMLTableElement,
  TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="max-w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn(
        'w-full border-collapse text-sm text-foreground',
        className,
      )}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';
export const TableHeader = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead {...props} />
);
export const TableBody = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...props} />
);
export const TableRow = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      'border-b border-border hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
      className,
    )}
    {...props}
  />
);
export const TableHead = ({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn(
      'bg-muted px-4 py-3 text-start font-semibold text-[var(--text-secondary)]',
      className,
    )}
    {...props}
  />
);
export const TableCell = ({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn('px-4 py-3 text-start align-middle', className)}
    {...props}
  />
);
