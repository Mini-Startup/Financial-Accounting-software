'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, X, Lock, Columns3 } from 'lucide-react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { CustomCheckbox } from './CustomCheckbox';
import { cn } from '@/utils/cn';

export interface ColumnDefinition {
  key: string;
  label: string;
  isDefault?: boolean;
  required?: boolean;
}

interface ColumnSettingsPopoverProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onChange: (visibleKeys: string[]) => void;
  storageKey?: string;
  className?: string;
}

export function ColumnSettingsPopover({
  columns,
  visibleColumns,
  onChange,
  storageKey,
  className = '',
}: ColumnSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useOutsideClickClose<HTMLDivElement>(() => setIsOpen(false));

  // Save to localStorage whenever visibleColumns change and storageKey is set
  useEffect(() => {
    if (storageKey && visibleColumns.length > 0 && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
      } catch (e) {
        console.warn('Could not save column preferences to localStorage:', e);
      }
    }
  }, [visibleColumns, storageKey]);

  const toggleColumn = (colKey: string) => {
    const col = columns.find((c) => c.key === colKey);
    if (col?.required) return; // Cannot toggle required columns

    if (visibleColumns.includes(colKey)) {
      if (visibleColumns.length <= 1) return; // Keep at least one column
      onChange(visibleColumns.filter((k) => k !== colKey));
    } else {
      onChange([...visibleColumns, colKey]);
    }
  };

  const handleReset = () => {
    const defaultKeys = columns
      .filter((c) => c.isDefault !== false || c.required)
      .map((c) => c.key);
    onChange(defaultKeys.length > 0 ? defaultKeys : columns.map((c) => c.key));
  };

  return (
    <div className={cn('relative inline-block', className)} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-9 inline-flex items-center gap-1.5 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs select-none',
          isOpen
            ? 'bg-blue-50/90 border-blue-300 text-[#2652C8]'
            : 'bg-white border-slate-200/90 hover:bg-slate-50 text-slate-700 hover:border-slate-300'
        )}
        title="Customize visible columns"
      >
        <SlidersHorizontal className={cn('w-3.5 h-3.5', isOpen ? 'text-[#2652C8]' : 'text-slate-500')} />
        <span>Columns</span>
        <span
          className={cn(
            'ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
            isOpen ? 'bg-blue-100 text-[#1D4ED8]' : 'bg-slate-100 text-slate-600'
          )}
        >
          {visibleColumns.length}/{columns.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-slate-200/90 shadow-[0_16px_40px_rgba(15,23,42,0.14)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Executive Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 text-[#2652C8] flex items-center justify-center shrink-0">
                <Columns3 className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">Visible Columns</h3>
                <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                  Choose fields shown in table
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Reset to default columns"
                className="p-1.5 text-slate-400 hover:text-[#2652C8] rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Column Checkbox Rows */}
          <div className="p-2 max-h-68 overflow-y-auto space-y-1 bg-white">
            {columns.map((col) => {
              const isChecked = visibleColumns.includes(col.key);
              return (
                <div
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all border',
                    col.required
                      ? 'bg-slate-50/70 border-slate-100 cursor-default'
                      : isChecked
                      ? 'bg-blue-50/40 border-blue-100/90 hover:bg-blue-50/70 cursor-pointer'
                      : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200/70 cursor-pointer'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CustomCheckbox
                      checked={isChecked}
                      disabled={col.required}
                      onChange={() => toggleColumn(col.key)}
                    />
                    <span
                      className={cn(
                        'font-semibold truncate',
                        isChecked ? 'text-slate-900' : 'text-slate-600'
                      )}
                    >
                      {col.label}
                    </span>
                  </div>

                  {col.required && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 text-[10px] font-semibold shrink-0">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>Fixed</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Executive Footer */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">
              <strong className="text-slate-900 font-bold">{visibleColumns.length}</strong> of {columns.length} active
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer transition-colors"
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => onChange(columns.map((c) => c.key))}
                className="text-[#2652C8] hover:text-[#1D4ED8] font-bold cursor-pointer transition-colors"
              >
                Show All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
