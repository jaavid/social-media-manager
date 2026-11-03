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
  <div className="ds-table-scroll max-w-full overflow-x-auto" tabIndex={0}>
    <table
      ref={ref}
      className={cn(
        'ds-density-table w-full border-collapse text-sm text-foreground',
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
      'bg-muted px-[var(--density-table-inline)] py-[var(--density-table-block)] text-start font-semibold text-[var(--text-secondary)]',
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
    className={cn('px-[var(--density-table-inline)] py-[var(--density-table-block)] text-start align-middle', className)}
    {...props}
  />
);
