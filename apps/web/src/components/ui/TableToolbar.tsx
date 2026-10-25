'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  SlidersHorizontal,
  Replace,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AdvancedCondition } from '@/utils/tableFilter';
import { UniversalDropdown } from '@/components/ui/UniversalDropdown';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface ColumnOption {
  key: string;
  label: string;
}

export interface TableToolbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;

  // Column targeting for search
  columns?: ColumnOption[];
  searchColumn?: string;
  onSearchColumnChange?: (col: string) => void;

  // Advanced search conditions
  advancedConditions?: AdvancedCondition[];
  onAdvancedConditionsChange?: (conditions: AdvancedCondition[]) => void;

  // Find & Replace trigger
  showFindReplaceButton?: boolean;
  isFindReplaceOpen?: boolean;
  onToggleFindReplace?: () => void;

  // Selection
  selectedCount?: number;
  onBulkDelete?: () => void;
  onClearSelection?: () => void;
  isDeleting?: boolean;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];

  // Custom slots
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Type to search...',
  columns,
  searchColumn = 'ALL',
  onSearchColumnChange,
  advancedConditions,
  onAdvancedConditionsChange,
  showFindReplaceButton = false,
  isFindReplaceOpen = false,
  onToggleFindReplace,
  selectedCount = 0,
  onBulkDelete,
  onClearSelection,
  isDeleting = false,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [15, 25, 50, 100],
  filterSlot,
  actionSlot,
  className,
}: TableToolbarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [conditions, setConditions] = useState<AdvancedCondition[]>(advancedConditions || []);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleAddCondition = () => {
    const defaultCol = columns && columns.length > 0 ? columns[0].key : '';
    const newCond: AdvancedCondition = {
      id: Math.random().toString(36).substring(2, 9),
      column: defaultCol,
      operator: 'contains',
      value: '',
      conjunction: 'AND',
    };
    const updated = [...conditions, newCond];
    setConditions(updated);
  };

  const handleRemoveCondition = (id: string) => {
    const updated = conditions.filter((c) => c.id !== id);
    setConditions(updated);
    if (onAdvancedConditionsChange) {
      onAdvancedConditionsChange(updated);
    }
  };

  const handleUpdateCondition = (id: string, updates: Partial<AdvancedCondition>) => {
    const updated = conditions.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setConditions(updated);
  };

  const handleApplyAdvanced = () => {
    if (onAdvancedConditionsChange) {
      onAdvancedConditionsChange(conditions);
    }
    setIsAdvancedOpen(false);
  };

  const handleClearAdvanced = () => {
    setConditions([]);
    if (onAdvancedConditionsChange) {
      onAdvancedConditionsChange([]);
    }
    setIsAdvancedOpen(false);
  };

  const activeAdvancedCount = conditions.filter((c) => c.value && c.value.trim() !== '').length;

  return (
    <>
      <div
        className={cn(
          'flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white border border-[var(--color-border-light)] rounded-t-xl shadow-xs',
          className
        )}
      >
        {/* Left side: Search & Filters or Bulk Selection Bar */}
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-in fade-in duration-150">
              <span className="text-xs font-bold text-emerald-800">
                {selectedCount} selected
              </span>
              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-xs text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
              {onBulkDelete && (
                <button
                  type="button"
                  onClick={onBulkDelete}
                  disabled={isDeleting}
                  className="btn btn--secondary text-xs py-1 px-2.5 flex items-center gap-1.5 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border-red-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {onSearchChange && (
                <div className="flex items-center bg-white border border-[var(--color-border-medium)] rounded-lg shadow-2xs hover:border-[var(--color-border-focus)] focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-leaf)]/15 transition-all min-w-[260px] max-w-md flex-1">
                  {/* Column targeting dropdown in front of search */}
                  {columns && columns.length > 0 && onSearchColumnChange && (
                    <div className="w-[125px] shrink-0 border-r border-[var(--color-border-light)]">
                      <UniversalDropdown
                        value={searchColumn}
                        onChange={onSearchColumnChange}
                        searchable={false}
                        options={[
                          { value: 'ALL', label: 'All Columns' },
                          ...columns.map((c) => ({ value: c.key, label: c.label })),
                        ]}
                        triggerClassName="min-h-[34px] h-[34px] rounded-none rounded-l-lg border-0 bg-slate-50/70 hover:bg-slate-100 shadow-none px-2 text-[11px] font-semibold text-[var(--color-charcoal)]"
                      />
                    </div>
                  )}

                  {/* Search text input */}
                  <div className="relative flex-1 flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full h-8.5 px-2.5 text-xs bg-transparent text-[var(--color-charcoal)] placeholder:text-slate-400 outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="p-1 mr-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Advanced Filter condition trigger button */}
                  {onAdvancedConditionsChange && columns && columns.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen(true)}
                      className={cn(
                        'h-8.5 px-2.5 flex items-center gap-1 text-[11px] font-semibold border-l border-[var(--color-border-light)] rounded-r-lg transition-colors cursor-pointer select-none',
                        activeAdvancedCount > 0
                          ? 'bg-[var(--color-mist)] text-[var(--color-forest)]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      )}
                      title="Advanced Filter (AND / OR conditions)"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {activeAdvancedCount > 0 && (
                        <span className="w-4 h-4 bg-[var(--color-forest)] text-white text-[9px] rounded-full flex items-center justify-center font-mono">
                          {activeAdvancedCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Find & Replace Trigger Button */}
              {showFindReplaceButton && onToggleFindReplace && (
                <button
                  type="button"
                  onClick={onToggleFindReplace}
                  className={cn(
                    'h-8.5 px-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer',
                    isFindReplaceOpen
                      ? 'bg-[var(--color-mist)] text-[var(--color-forest)] border-[var(--color-leaf)] shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                  )}
                  title="Find & Replace in Table (Ctrl+H)"
                >
                  <Replace className="w-3.5 h-3.5 text-[var(--color-leaf)]" />
                  <span className="hidden sm:inline">Find & Replace</span>
                </button>
              )}

              {filterSlot}
            </>
          )}
        </div>

        {/* Right side: Actions & Top Pagination Toolbar */}
        <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
          {actionSlot}

          {/* Pagination Toolbar */}
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono select-none">
            {/* Page size limit selector */}
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-[11px] text-slate-400 font-medium">Limit:</span>
              <CustomSelect<number>
                value={pageSize}
                options={pageSizeOptions}
                onChange={(val) => {
                  onPageSizeChange(Number(val));
                  onPageChange(1);
                }}
                size="xs"
                menuWidth={75}
                align="right"
              />
            </div>

            <span className="text-slate-300">|</span>

            {/* Records count display: 1 - 25 of 100 */}
            <span className="font-bold text-slate-700">
              {startItem} - {endItem} of {totalItems}
            </span>

            <span className="text-slate-300">|</span>

            {/* Navigation arrows < > */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Modal Overlay (No section inserted between tables) */}
      {isAdvancedOpen &&
        columns &&
        columns.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xl max-w-xl w-full p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[var(--color-mist)] text-[var(--color-forest)] rounded-lg">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-charcoal)] font-display">
                      Advanced Multi-Column Filter
                    </h3>
                    <p className="text-[11px] text-[var(--color-slate)]">
                      Combine AND / OR rules across multiple table columns
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conditions Rows */}
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                {conditions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 bg-[var(--color-snow)] rounded-xl border border-dashed border-[var(--color-border-medium)]">
                    No advanced conditions configured. Click below to add your first rule.
                  </div>
                ) : (
                  conditions.map((cond, idx) => (
                    <div
                      key={cond.id}
                      className="flex flex-wrap items-center gap-2 p-2 bg-[var(--color-snow)] border border-[var(--color-border-light)] rounded-lg text-xs"
                    >
                      {idx > 0 && (
                        <CustomSelect<'AND' | 'OR'>
                          value={cond.conjunction || 'AND'}
                          options={['AND', 'OR']}
                          onChange={(val) =>
                            handleUpdateCondition(cond.id, {
                              conjunction: val,
                            })
                          }
                          size="xs"
                          menuWidth={75}
                        />
                      )}

                      {/* Column */}
                      <CustomSelect<string>
                        value={cond.column}
                        options={columns.map((c) => ({ value: c.key, label: c.label }))}
                        onChange={(val) => handleUpdateCondition(cond.id, { column: val })}
                        size="xs"
                        menuWidth={140}
                      />

                      {/* Operator */}
                      <CustomSelect<string>
                        value={cond.operator}
                        options={[
                          { value: 'contains', label: 'contains' },
                          { value: 'equals', label: 'equals' },
                          { value: 'starts_with', label: 'starts with' },
                          { value: 'ends_with', label: 'ends with' },
                          { value: 'gt', label: '> greater than' },
                          { value: 'lt', label: '< less than' },
                        ]}
                        onChange={(val) =>
                          handleUpdateCondition(cond.id, {
                            operator: val as any,
                          })
                        }
                        size="xs"
                        menuWidth={130}
                      />

                      {/* Value */}
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => handleUpdateCondition(cond.id, { value: e.target.value })}
                        placeholder="Filter value..."
                        className="h-8 flex-1 min-w-[120px] px-2.5 bg-white border border-[var(--color-border-medium)] rounded text-[var(--color-charcoal)] outline-none focus:border-[var(--color-border-focus)]"
                      />

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(cond.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Remove condition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-3">
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-forest)] bg-[var(--color-snow)] hover:bg-[var(--color-mist)] border border-[var(--color-border-light)] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Condition</span>
                </button>

                <div className="flex items-center gap-2">
                  {conditions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAdvanced}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyAdvanced}
                    className="px-4 py-1.5 text-xs font-semibold bg-[var(--color-forest)] hover:bg-[var(--color-emerald)] text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Apply Rules
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
