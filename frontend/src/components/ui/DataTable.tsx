/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useMemo, useState, useEffect } from 'react';
import type { CSSProperties, ReactNode, ComponentProps } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './Table';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../i18n';
export interface Column<T> {
  key: string;
  header: ReactNode;
  accessor?: (row: T) => string | number | null | undefined;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'right' | 'center' | 'start' | 'end';
}
export interface DataTableProps<T> {
  columns: Column<T>[];
  rows?: T[];
  rowKey?: keyof T | ((row: T) => string | number);
  onRowClick?: (row: T, index: number) => void;
  loading?: boolean;
  pageSize?: number;
  emptyState?: ComponentProps<typeof EmptyState>;
  stickyHeader?: boolean;
  className?: string;
  style?: CSSProperties;
}
export default function DataTable<T extends Record<string, unknown>>({
  columns,
  rows = [],
  rowKey,
  onRowClick,
  loading = false,
  pageSize = 25,
  emptyState,
  stickyHeader = true,
  className,
  style,
}: DataTableProps<T>) {
  const { tr, isPersian, formatNumber } = useLanguage();
  const [sort, setSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => {
    const accessor = columns.find((c) => c.key === sort?.key)?.accessor;
    if (!accessor || !sort) return rows;
    return [...rows].sort((a, b) => {
      const av = accessor(a),
        bv = accessor(b);
      if (av == null) return bv == null ? 0 : 1;
      if (bv == null) return -1;
      return (
        (av < bv ? -1 : av > bv ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1)
      );
    });
  }, [rows, columns, sort]);
  const pageCount =
    pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);
  const visible =
    pageSize > 0
      ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : sorted;
  function toggle(key: string) {
    setPage(1);
    setSort((s) =>
      s?.key !== key
        ? { key, direction: 'asc' }
        : s.direction === 'asc'
          ? { key, direction: 'desc' }
          : null,
    );
  }
  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-2xl border border-border bg-card',
        className,
      )}
      style={style}
      aria-busy={loading}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => {
              const sortable = c.sortable !== false && !!c.accessor;
              return (
                <TableHead
                  key={c.key}
                  className={cn(stickyHeader && 'sticky top-0 z-10')}
                  style={{ width: c.width, textAlign: c.align || 'start' }}
                  aria-sort={
                    sort?.key === c.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : sortable
                        ? 'none'
                        : undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded px-1 text-start focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => toggle(c.key)}
                    >
                      {typeof c.header === 'string' ? tr(c.header) : c.header}
                      <ArrowUpDown size={14} aria-hidden />
                    </button>
                  ) : typeof c.header === 'string' ? (
                    tr(c.header)
                  ) : (
                    c.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <span role="status" className="sr-only">
                  {tr('Loading…')}
                </span>
                <Skeleton height={44} />
              </TableCell>
            </TableRow>
          ) : !visible.length ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <EmptyState title="Nothing here yet" {...emptyState} />
              </TableCell>
            </TableRow>
          ) : (
            visible.map((row, index) => {
              const key =
                typeof rowKey === 'function'
                  ? rowKey(row)
                  : String(row[rowKey || 'id'] ?? index);
              return (
                <TableRow
                  key={key}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={
                    onRowClick ? () => onRowClick(row, index) : undefined
                  }
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (onRowClick && ['Enter', ' '].includes(e.key)) {
                      e.preventDefault();
                      onRowClick(row, index);
                    }
                  }}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      style={{ textAlign: c.align || 'start' }}
                    >
                      {c.render
                        ? c.render(row, index)
                        : c.accessor
                          ? c.accessor(row)
                          : (row[c.key] as ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3"
          aria-label={tr('Pagination')}
        >
          <span className="text-sm text-[var(--text-secondary)]">
            {formatNumber(currentPage)} / {formatNumber(pageCount)}
          </span>
          <div className="flex gap-2">
            <button
              className="ds-icon-button"
              type="button"
              disabled={currentPage === 1}
              aria-label={tr('Previous page')}
              onClick={() => setPage(currentPage - 1)}
            >
              {isPersian ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
            <button
              className="ds-icon-button"
              type="button"
              disabled={currentPage === pageCount}
              aria-label={tr('Next page')}
              onClick={() => setPage(currentPage + 1)}
            >
              {isPersian ? (
                <ChevronLeft size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
