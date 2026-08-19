'use client';

import { Search, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface TableToolbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  
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

  // Custom filters slot
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
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

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-t-xl shadow-xs',
        className
      )}
    >
      {/* Left side: Search & Filters or Bulk Selection Bar */}
      <div className="flex items-center gap-3 flex-1 flex-wrap">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-in fade-in duration-150">
            <span className="text-xs font-bold text-emerald-800">
              {selectedCount} selected
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-emerald-700 hover:text-emerald-900 underline font-medium"
              >
                Clear
              </button>
            )}
            {onBulkDelete && (
              <button
                type="button"
                onClick={onBulkDelete}
                disabled={isDeleting}
                className="btn btn--secondary text-xs py-1 px-2.5 flex items-center gap-1.5 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {onSearchChange && (
              <div className="relative min-w-[220px] max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="input pl-9 pr-8 text-xs py-1.5 w-full bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {filterSlot}
          </>
        )}
      </div>

      {/* Right side: Actions & Top Pagination Toolbar */}
      <div className="flex items-center gap-4 self-end md:self-auto flex-wrap">
        {actionSlot}

        {/* Pagination Toolbar */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-mono select-none">
          {/* Page size limit selector */}
          <div className="flex items-center gap-1.5 font-sans">
            <span className="text-[11px] text-slate-400 font-medium">Limit:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="input py-1 px-2 text-xs font-mono font-bold bg-slate-50 rounded border-slate-200"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
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
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
