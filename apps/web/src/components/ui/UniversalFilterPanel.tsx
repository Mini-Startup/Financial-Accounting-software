'use client';

import { useState } from 'react';
import { Filter, X, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { UniversalDatePicker } from './UniversalDatePicker';
import { CustomSelect } from './CustomSelect';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'daterange' | 'boolean';
  options?: FilterOption[];
  placeholder?: string;
}

export interface UniversalFilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function UniversalFilterPanel({
  filters,
  values,
  onChange,
  className,
  defaultExpanded = false,
}: UniversalFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const activeEntries = Object.entries(values).filter(([, val]) => {
    if (val === undefined || val === null || val === '' || val === 'ALL') return false;
    if (typeof val === 'object' && !val.from && !val.to) return false;
    return true;
  });

  const activeCount = activeEntries.length;

  const handleUpdate = (key: string, val: any) => {
    const next = { ...values, [key]: val };
    if (val === '' || val === 'ALL' || val === null) {
      delete next[key];
    }
    onChange(next);
  };

  const handleClearAll = () => {
    onChange({});
  };

  const handleRemoveChip = (key: string) => {
    const next = { ...values };
    delete next[key];
    onChange(next);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition-all cursor-pointer select-none',
              isExpanded || activeCount > 0
                ? 'bg-[var(--color-mist)] text-[var(--color-forest)] border-[var(--color-leaf)]/30'
                : 'bg-white text-[var(--color-slate)] border-[var(--color-border-medium)] hover:border-[var(--color-slate)]'
            )}
          >
            <Filter className="w-3.5 h-3.5 text-[var(--color-leaf)]" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[var(--color-forest)] text-white text-[10px] rounded-full font-mono">
                {activeCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          {/* Active Filter Chips */}
          {activeEntries.map(([key, val]) => {
            const conf = filters.find((f) => f.key === key);
            let displayVal = String(val);
            if (conf?.options) {
              const opt = conf.options.find((o) => o.value === String(val));
              if (opt) displayVal = opt.label;
            } else if (typeof val === 'object' && (val.from || val.to)) {
              displayVal = `${val.from || 'Start'} → ${val.to || 'End'}`;
            }

            return (
              <div
                key={key}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] text-[var(--color-forest)] font-medium animate-in fade-in duration-100"
              >
                <span className="text-[var(--color-slate)]">{conf?.label || key}:</span>
                <span className="font-semibold">{displayVal}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveChip(key)}
                  className="p-0.5 text-emerald-700 hover:text-[var(--color-negative)] transition-colors rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors cursor-pointer select-none"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Expanded Filter Drawer */}
      {isExpanded && (
        <div className="p-3.5 bg-white border border-[var(--color-border-light)] rounded-[var(--radius-lg)] shadow-xs animate-in fade-in duration-150 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filters.map((filter) => {
            const currentVal = values[filter.key];

            if (filter.type === 'select') {
              return (
                <div key={filter.key} className="flex flex-col gap-1 text-xs">
                  <label className="font-semibold text-[var(--color-charcoal)] text-[11px]">
                    {filter.label}
                  </label>
                  <CustomSelect<string>
                    value={currentVal || 'ALL'}
                    options={[
                      { value: 'ALL', label: `All ${filter.label}` },
                      ...(filter.options || []).map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      })),
                    ]}
                    onChange={(val) => handleUpdate(filter.key, val)}
                    size="sm"
                    triggerClassName="w-full justify-between"
                  />
                </div>
              );
            }

            if (filter.type === 'date') {
              return (
                <div key={filter.key} className="flex flex-col gap-1 text-xs">
                  <label className="font-semibold text-[var(--color-charcoal)] text-[11px]">
                    {filter.label}
                  </label>
                  <div className="relative flex items-center">
                    <UniversalDatePicker
                      value={currentVal || ''}
                      onChange={(d) => handleUpdate(filter.key, d)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
              );
            }

            if (filter.type === 'daterange') {
              const rangeVal = currentVal || { from: '', to: '' };
              return (
                <div key={filter.key} className="flex flex-col gap-1 text-xs sm:col-span-2">
                  <label className="font-semibold text-[var(--color-charcoal)] text-[11px]">
                    {filter.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <UniversalDatePicker
                      value={rangeVal.from || ''}
                      onChange={(d) =>
                        handleUpdate(filter.key, { ...rangeVal, from: d })
                      }
                      placeholder="From Date"
                    />
                    <span className="text-[var(--color-slate)] text-xs">to</span>
                    <UniversalDatePicker
                      value={rangeVal.to || ''}
                      onChange={(d) =>
                        handleUpdate(filter.key, { ...rangeVal, to: d })
                      }
                      placeholder="To Date"
                    />
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
