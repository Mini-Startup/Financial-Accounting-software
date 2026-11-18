'use client';

import React, { useMemo } from 'react';
import {
  Table,
  Checkbox,
  CheckboxContent,
  CheckboxControl,
  CheckboxIndicator,
  type SortDescriptor,
  type Selection,
} from '@heroui/react';
import { cn } from '@/utils/cn';

export interface HeroTableColumn<T> {
  id: string;
  name: string;
  allowsSorting?: boolean;
  isRowHeader?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface HeroTableProps<T extends { id: string | number }> {
  columns: HeroTableColumn<T>[];
  items: T[];
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  selectionMode?: 'none' | 'single' | 'multiple';
  ariaLabel?: string;
  className?: string;
  emptyContent?: React.ReactNode;
  onRowClick?: (item: T) => void;
}

/**
 * HeroUI v3 Composable Table
 * Implements accessible React Aria selection, allowsSorting, and sortDescriptor.
 */
export function HeroTable<T extends { id: string | number }>({
  columns,
  items,
  selectedKeys,
  onSelectionChange,
  sortDescriptor,
  onSortChange,
  selectionMode = 'none',
  ariaLabel = 'Data Table',
  className,
  emptyContent = 'No records found.',
  onRowClick,
}: HeroTableProps<T>) {
  return (
    <Table className={cn('w-full', className)}>
      <Table.ScrollContainer className="overflow-x-auto rounded-xl">
        <Table.Content
          aria-label={ariaLabel}
          sortDescriptor={sortDescriptor}
          onSortChange={onSortChange}
          selectedKeys={selectedKeys}
          selectionMode={selectionMode}
          onSelectionChange={onSelectionChange}
          className="min-w-full text-xs"
        >
          <Table.Header>
            {selectionMode === 'multiple' && (
              <Table.Column className="w-10 text-center pe-0">
                <Checkbox aria-label="Select all rows" slot="selection">
                  <CheckboxContent>
                    <CheckboxControl>
                      <CheckboxIndicator />
                    </CheckboxControl>
                  </CheckboxContent>
                </Checkbox>
              </Table.Column>
            )}

            {columns.map((col) => {
              if (col.allowsSorting) {
                return (
                  <Table.Column
                    key={col.id}
                    id={col.id}
                    allowsSorting
                    isRowHeader={col.isRowHeader}
                    className={cn(
                      'text-xs font-bold text-slate-700 py-3 px-3.5 select-none',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                  >
                    {({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>
                        {col.name}
                      </Table.SortableColumnHeader>
                    )}
                  </Table.Column>
                );
              }

              return (
                <Table.Column
                  key={col.id}
                  id={col.id}
                  isRowHeader={col.isRowHeader}
                  className={cn(
                    'text-xs font-bold text-slate-700 py-3 px-3.5 select-none',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.name}
                </Table.Column>
              );
            })}
          </Table.Header>

          <Table.Body>
            {items.length === 0 ? (
              <Table.Row id="empty-row">
                <Table.Cell
                  colSpan={columns.length + (selectionMode === 'multiple' ? 1 : 0)}
                  className="py-12 text-center text-slate-400 font-medium"
                >
                  {emptyContent}
                </Table.Cell>
              </Table.Row>
            ) : (
              items.map((item, idx) => (
                <Table.Row
                  key={item.id}
                  id={item.id}
                  className={cn(
                    'transition-colors border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer',
                    onRowClick && 'cursor-pointer'
                  )}
                  onAction={() => {
                    if (onRowClick) onRowClick(item);
                  }}
                >
                  {selectionMode === 'multiple' && (
                    <Table.Cell className="w-10 text-center pe-0">
                      <Checkbox
                        aria-label={`Select row ${item.id}`}
                        slot="selection"
                        variant="secondary"
                      >
                        <CheckboxContent>
                          <CheckboxControl>
                            <CheckboxIndicator />
                          </CheckboxControl>
                        </CheckboxContent>
                      </Checkbox>
                    </Table.Cell>
                  )}

                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(item, idx)
                      : String((item as any)[col.id] ?? '—');

                    return (
                      <Table.Cell
                        key={col.id}
                        className={cn(
                          'py-2.5 px-3.5 text-xs text-slate-800',
                          col.align === 'right' && 'text-right font-mono',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {content}
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
