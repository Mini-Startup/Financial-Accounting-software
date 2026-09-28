'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { CustomCheckbox } from './CustomCheckbox';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
  sum?: boolean;
  sumFormatter?: (total: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
}

export interface UniversalDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T, index: number) => string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  showTotalRow?: boolean;
  totalLabel?: string;
  pageSize?: number;
  showPagination?: boolean;
  className?: string;
  emptyMessage?: string;
  stickyHeader?: boolean;
  onRowDoubleClick?: (row: T) => void;
  onRowClick?: (row: T) => void;
}

export function UniversalDataTable<T>({
  data,
  columns,
  keyExtractor,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  showTotalRow = true,
  totalLabel = 'Total (Visible Rows)',
  pageSize = 50,
  showPagination = true,
  className,
  emptyMessage = 'No records found matching criteria',
  stickyHeader = true,
  onRowDoubleClick,
  onRowClick,
}: UniversalDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const aVal = col.accessor ? col.accessor(a) : (a as any)[sortKey];
      const bVal = col.accessor ? col.accessor(b) : (b as any)[sortKey];

      if (aVal === bVal) return 0;
      if (aVal == null) return sortDir === 'asc' ? -1 : 1;
      if (bVal == null) return sortDir === 'asc' ? 1 : -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDir, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / currentPageSize) || 1;
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = (currentPage - 1) * currentPageSize;
    return sortedData.slice(start, start + currentPageSize);
  }, [sortedData, currentPage, currentPageSize, showPagination]);

  // Visible items for calculating totals and select all
  const visibleData = showPagination ? paginatedData : sortedData;

  // Calculate totals strictly for currently visible rows
  const totals = useMemo(() => {
    const res: Record<string, number> = {};
    columns.forEach((col) => {
      if (col.sum) {
        let sum = 0;
        visibleData.forEach((row) => {
          const val = col.accessor ? col.accessor(row) : (row as any)[col.key];
          const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
          if (!isNaN(num)) sum += num;
        });
        res[col.key] = sum;
      }
    });
    return res;
  }, [columns, visibleData]);

  const hasSummableColumn = columns.some((c) => c.sum);

  // Selection state
  const visibleKeys = useMemo(
    () => visibleData.map((row, idx) => keyExtractor(row, idx)),
    [visibleData, keyExtractor]
  );

  const isAllVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.has(k));

  const handleToggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (checked) {
      visibleKeys.forEach((k) => next.add(k));
    } else {
      visibleKeys.forEach((k) => next.delete(k));
    }
    onSelectionChange(next);
  };

  const handleToggleRow = (key: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    onSelectionChange(next);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className={cn('flex flex-col bg-white border border-[var(--color-border-light)] rounded-[var(--radius-lg)] shadow-xs overflow-hidden', className)}>
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse text-xs">
          {/* Header */}
          <thead className={cn('bg-[var(--color-snow)] text-[var(--color-slate)] border-b border-[var(--color-border-light)] select-none', stickyHeader && 'sticky top-0 z-10 backdrop-blur-xs')}>
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-3 text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleAll}
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const canSort = col.sortable !== false;

                return (
                  <th
                    key={col.key}
                    onClick={() => canSort && handleSort(col.key)}
                    className={cn(
                      'px-3.5 py-3 font-semibold uppercase tracking-wider text-[11px]',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      canSort && 'cursor-pointer hover:text-[var(--color-charcoal)] transition-colors',
                      col.headerClassName
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'right' && 'justify-end w-full',
                        col.align === 'center' && 'justify-center w-full'
                      )}
                    >
                      <span>{col.header}</span>
                      {canSort && (
                        <span className="shrink-0 text-[var(--color-fog)]">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[var(--color-forest)] font-bold" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-forest)] font-bold" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-[var(--color-border-light)]">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-[var(--color-slate)]"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-[var(--color-fog)] stroke-[1.5]" />
                    <p className="text-xs font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const key = keyExtractor(row, idx);
                const isSelected = selectedKeys.has(key);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                    className={cn(
                      'transition-colors duration-100',
                      isSelected ? 'bg-[var(--color-mist)]/50' : 'hover:bg-[var(--color-snow)]',
                      (onRowClick || onRowDoubleClick) && 'cursor-pointer'
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5 text-center">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={(chk) => handleToggleRow(key, chk)}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const val = col.accessor ? col.accessor(row) : (row as any)[col.key];
                      const rendered = col.render ? col.render(row, idx) : val;

                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'px-3.5 py-2.5 text-[var(--color-charcoal)]',
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                            (col.isNumeric || typeof val === 'number') && 'font-mono tabular-nums',
                            col.className
                          )}
                        >
                          {rendered != null ? rendered : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Total / Summary Row */}
          {showTotalRow && hasSummableColumn && paginatedData.length > 0 && (
            <tfoot className="bg-[var(--color-snow)] font-semibold border-t-2 border-[var(--color-border-medium)] text-xs text-[var(--color-charcoal)] sticky bottom-0">
              <tr>
                {selectable && <td className="px-3 py-2.5"></td>}
                {columns.map((col, idx) => {
                  if (col.sum) {
                    const totalVal = totals[col.key] || 0;
                    const content = col.sumFormatter
                      ? col.sumFormatter(totalVal)
                      : Number.isInteger(totalVal)
                      ? totalVal.toLocaleString('en-IN')
                      : totalVal.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        });

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3.5 py-2.5 font-mono tabular-nums text-[var(--color-forest)] font-bold',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        )}
                      >
                        {content}
                      </td>
                    );
                  }

                  // Display the total label in the first non-numeric column
                  if (idx === 0) {
                    return (
                      <td key={col.key} className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-[var(--color-forest)]">
                        {totalLabel}
                      </td>
                    );
                  }

                  return <td key={col.key} className="px-3.5 py-2.5"></td>;
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      {showPagination && sortedData.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-[var(--color-border-light)] bg-white text-xs text-[var(--color-slate)] select-none">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={currentPageSize}
              onChange={(e) => {
                setCurrentPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 px-2 bg-[var(--color-snow)] border border-[var(--color-border-medium)] rounded text-xs text-[var(--color-charcoal)] outline-none"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
            </select>
            <span>rows per page</span>
            <span className="text-[var(--color-fog)]">|</span>
            <span>
              Showing{' '}
              <strong className="text-[var(--color-charcoal)]">
                {Math.min((currentPage - 1) * currentPageSize + 1, sortedData.length)}
              </strong>{' '}
              to{' '}
              <strong className="text-[var(--color-charcoal)]">
                {Math.min(currentPage * currentPageSize, sortedData.length)}
              </strong>{' '}
              of <strong className="text-[var(--color-charcoal)]">{sortedData.length}</strong> records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1 border border-[var(--color-border-medium)] rounded hover:bg-[var(--color-snow)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1 border border-[var(--color-border-medium)] rounded hover:bg-[var(--color-snow)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
