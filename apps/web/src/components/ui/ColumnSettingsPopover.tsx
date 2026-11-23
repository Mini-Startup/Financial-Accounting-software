'use client';

import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Check, RotateCcw, X } from 'lucide-react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';

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
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer"
        title="Customize visible columns"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns</span>
        <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono">
          {visibleColumns.length}/{columns.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white rounded-2xl border border-slate-200/90 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Customize Columns</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Reset to default columns"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-2 max-h-60 overflow-y-auto space-y-0.5 divide-y divide-slate-50">
            {columns.map((col) => {
              const isChecked = visibleColumns.includes(col.key);
              return (
                <label
                  key={col.key}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                    col.required ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`font-medium ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                    {col.label}
                    {col.required && <span className="ml-1 text-[10px] text-slate-400 font-normal">(Required)</span>}
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={col.required}
                    onChange={() => toggleColumn(col.key)}
                    className="w-4 h-4 rounded border-slate-300 text-forest focus:ring-forest cursor-pointer"
                  />
                </label>
              );
            })}
          </div>

          <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>{visibleColumns.length} visible</span>
            <button
              type="button"
              onClick={() => onChange(columns.map((c) => c.key))}
              className="text-forest hover:underline font-semibold cursor-pointer"
            >
              Show all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
