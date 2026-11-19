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
import { ColumnSettingsPopover, ColumnDefinition } from '@/components/ui/ColumnSettingsPopover';
import { UniversalTooltip } from '@/components/ui/UniversalTooltip';

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
  pageSizeOptions?: Array<number | { value: number; label: string }>;
  compactSearch?: boolean;

  // Custom slots
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  columnSettings?: {
    columns?: ColumnDefinition[];
    visibleColumns: string[];
    onChange: (visibleKeys: string[]) => void;
    storageKey?: string;
  };
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
  compactSearch = false,
  filterSlot,
  actionSlot,
  columnSettings,
  className,
}: TableToolbarProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchQuery));
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
          'flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200/80',
          className
        )}
      >
        {/* Left side: Search & Filters */}
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {onSearchChange && (
            <div className={cn(
              "flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 focus-within:border-[#2652C8] focus-within:ring-2 focus-within:ring-[#2652C8]/15 transition-all",
              compactSearch ? "w-56 sm:w-64" : "min-w-65 max-w-md flex-1"
            )}>
              {/* Column targeting dropdown in front of search */}
              {columns && columns.length > 0 && onSearchColumnChange && !compactSearch && (
                <div className="w-31.25 shrink-0 border-r border-slate-200">
                  <UniversalDropdown
                    value={searchColumn}
                    onChange={onSearchColumnChange}
                    searchable={false}
                    options={[
                      { value: 'ALL', label: 'All Columns' },
                      ...columns.map((c) => ({ value: c.key, label: c.label })),
                    ]}
                    triggerClassName="min-h-9 h-9 rounded-none rounded-l-lg border-0 bg-slate-50/70 hover:bg-slate-100 shadow-none px-2.5 text-xs font-semibold text-slate-700"
                  />
                </div>
              )}

              {/* Search text input */}
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-9 px-2.5 text-xs bg-transparent text-slate-800 placeholder:text-slate-400 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="p-1 mr-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
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
                    'h-9 px-2.5 flex items-center gap-1.5 text-xs font-semibold border-l border-slate-200 rounded-r-lg transition-colors cursor-pointer select-none',
                    activeAdvancedCount > 0
                      ? 'bg-blue-50 text-[#2652C8]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  )}
                  title="Advanced Filter (AND / OR conditions)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {activeAdvancedCount > 0 && (
                    <span className="w-4 h-4 bg-[#2652C8] text-white text-[10px] rounded-md flex items-center justify-center font-bold">
                      {activeAdvancedCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Find & Replace Trigger Button */}
          {showFindReplaceButton && onToggleFindReplace && (
            <UniversalTooltip content="Find & Replace in Table (Ctrl+H)">
              <button
                type="button"
                onClick={onToggleFindReplace}
                className={cn(
                  'h-9 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs',
                  isFindReplaceOpen
                    ? 'bg-blue-50 text-[#2652C8] border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Replace className="w-3.5 h-3.5 text-[#2652C8]" />
                <span className="hidden sm:inline">Find & Replace</span>
              </button>
            </UniversalTooltip>
          )}

          {filterSlot}
        </div>

        {/* Floating Bulk Action Bar (Executive Dark Slate Pill, High Contrast) */}
        {selectedCount > 0 && typeof document !== 'undefined' && createPortal(
          <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-99999 bg-slate-900/95 text-white rounded-xl shadow-[0_16px_36px_rgba(15,23,42,0.4)] px-4 py-2 flex items-center gap-3.5 border border-slate-700/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 ease-out select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-xs bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-bold text-slate-100 tracking-wide">
                {selectedCount} selected
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-slate-300 hover:text-white font-medium hover:bg-slate-800 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
            {onBulkDelete && (
              <button
                type="button"
                onClick={onBulkDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}</span>
              </button>
            )}
          </div>,
          document.body
        )}

        {/* Right side: Actions & Top Pagination Toolbar */}
        <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
          {actionSlot}

          {columnSettings && (
            <ColumnSettingsPopover
              columns={(columnSettings.columns || columns || []).map((c) => ({
                key: c.key,
                label: c.label,
                isDefault: (c as any).isDefault ?? true,
                required: (c as any).required ?? false,
              }))}
              visibleColumns={columnSettings.visibleColumns}
              onChange={columnSettings.onChange}
              storageKey={columnSettings.storageKey}
            />
          )}

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
              <UniversalTooltip content="Previous Page">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </UniversalTooltip>
              <UniversalTooltip content="Next Page">
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </UniversalTooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Modal Overlay */}
      {isAdvancedOpen &&
        columns &&
        columns.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Unified Modal Header */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                      Advanced Multi-Column Filter
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Combine AND / OR rules across multiple table columns
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conditions Rows */}
              <div className="p-6 flex flex-col gap-2.5 max-h-72 overflow-y-auto">
                {conditions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    No advanced conditions configured. Click below to add your first rule.
                  </div>
                ) : (
                  conditions.map((cond, idx) => (
                    <div
                      key={cond.id}
                      className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg text-xs"
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
                        className="h-8 flex-1 min-w-30 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs outline-none focus:border-[#2652C8] focus:ring-1 focus:ring-[#2652C8]/20 transition-all"
                      />

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(cond.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove condition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Unified Modal Footer */}
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2652C8] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Condition</span>
                </button>

                <div className="flex items-center gap-2">
                  {conditions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAdvanced}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyAdvanced}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#2652C8] hover:bg-[#1E42A8] text-white rounded-lg shadow-xs transition-colors cursor-pointer"
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
