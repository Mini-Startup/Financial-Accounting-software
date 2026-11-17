'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { UniversalDropdown } from './UniversalDropdown';
import { CustomSelect } from './CustomSelect';

export type SearchOperator = 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'gt' | 'lt';

export interface SearchCondition {
  id: string;
  column: string;
  operator: SearchOperator;
  value: string;
  conjunction: 'AND' | 'OR';
}

export interface ColumnOption {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
}

export interface UniversalSearchBarProps {
  columns: ColumnOption[];
  onSearchChange: (query: string, selectedColumn: string, conditions?: SearchCondition[]) => void;
  placeholder?: string;
  className?: string;
  initialColumn?: string;
}

export function UniversalSearchBar({
  columns,
  onSearchChange,
  placeholder = 'Search records...',
  className,
  initialColumn = 'ALL',
}: UniversalSearchBarProps) {
  const [simpleQuery, setSimpleQuery] = useState('');
  const [selectedColumn, setSelectedColumn] = useState(initialColumn);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [conditions, setConditions] = useState<SearchCondition[]>([]);

  const handleSimpleSearch = (val: string, col: string) => {
    setSimpleQuery(val);
    setSelectedColumn(col);
    onSearchChange(val, col, conditions.length > 0 ? conditions : undefined);
  };

  const handleAddCondition = () => {
    const newCond: SearchCondition = {
      id: Math.random().toString(36).substring(2, 9),
      column: columns[0]?.key || '',
      operator: 'contains',
      value: '',
      conjunction: 'AND',
    };
    setConditions([...conditions, newCond]);
  };

  const handleRemoveCondition = (id: string) => {
    const updated = conditions.filter((c) => c.id !== id);
    setConditions(updated);
  };

  const handleUpdateCondition = (id: string, updates: Partial<SearchCondition>) => {
    const updated = conditions.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setConditions(updated);
  };

  const handleApplyAdvanced = () => {
    onSearchChange(simpleQuery, selectedColumn, conditions);
    setIsAdvancedOpen(false);
  };

  const handleClearAdvanced = () => {
    setConditions([]);
    onSearchChange(simpleQuery, selectedColumn, undefined);
    setIsAdvancedOpen(false);
  };

  const activeAdvancedCount = conditions.filter((c) => c.value.trim() !== '').length;

  return (
    <div className={cn('relative flex flex-col gap-2', className)}>
      {/* Simple Search Bar */}
      <div className="flex items-center bg-white border border-border-medium rounded-md shadow-xs transition-all focus-within:border-(--color-border-focus) focus-within:ring-2 focus-within:ring-(--color-leaf)/20">
        {/* Column Selector */}
        <div className="w-32.5 shrink-0 border-r border-border-light">
          <UniversalDropdown
            value={selectedColumn}
            onChange={(val) => handleSimpleSearch(simpleQuery, val)}
            searchable={false}
            options={[
              { value: 'ALL', label: 'All Columns' },
              ...columns.map((col) => ({ value: col.key, label: col.label })),
            ]}
            triggerClassName="min-h-8.5 h-8.5 rounded-none rounded-l-md border-0 bg-snow hover:bg-slate-100 shadow-none px-2.5 text-xs font-medium text-charcoal"
          />
        </div>

        {/* Input */}
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-fog ml-3 shrink-0" />
          <input
            type="text"
            value={simpleQuery}
            onChange={(e) => handleSimpleSearch(e.target.value, selectedColumn)}
            placeholder={placeholder}
            className="w-full h-9 px-3 text-xs bg-transparent text-charcoal placeholder:text-fog outline-none"
          />
          {simpleQuery && (
            <button
              type="button"
              onClick={() => handleSimpleSearch('', selectedColumn)}
              className="p-1 mr-2 text-slate hover:text-charcoal transition-colors rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Advanced Search Toggle */}
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          title="Advanced Search (AND/OR conditions)"
          className={cn(
            'h-9 px-3.5 flex items-center gap-1.5 text-xs font-medium border-l border-border-light rounded-r-md transition-colors cursor-pointer select-none',
            activeAdvancedCount > 0
              ? 'bg-mist text-(--color-forest) font-semibold'
              : 'text-slate hover:bg-snow hover:text-charcoal'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Advanced</span>
          {activeAdvancedCount > 0 && (
            <span className="px-1.5 py-0.2 bg-(--color-forest) text-white text-[10px] rounded-full font-mono">
              {activeAdvancedCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Search Drawer / Expanded Panel */}
      {isAdvancedOpen && (
        <div className="p-3.5 bg-white border border-border-light rounded-lg shadow-(--shadow-md) animate-in fade-in duration-150 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border-light pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-(--color-forest)" />
              <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                Advanced Multi-Column Filter
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(false)}
              className="p-1 text-slate hover:text-charcoal rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conditions Rows */}
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {conditions.length === 0 ? (
              <p className="text-xs text-slate italic py-2">
                No advanced conditions added. Click below to add multi-column AND/OR rules.
              </p>
            ) : (
              conditions.map((cond, idx) => (
                <div key={cond.id} className="flex flex-wrap items-center gap-2 text-xs">
                  {idx > 0 && (
                    <CustomSelect<'AND' | 'OR'>
                      value={cond.conjunction}
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
                    menuWidth={130}
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
                        operator: val as SearchOperator,
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
                    className="h-8 flex-1 min-w-30 px-2.5 bg-white border border-border-medium rounded text-charcoal outline-none focus:border-(--color-border-focus)"
                  />

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(cond.id)}
                    className="p-1.5 text-slate hover:text-negative hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-border-light pt-2 mt-1">
            <button
              type="button"
              onClick={handleAddCondition}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-(--color-forest) bg-snow hover:bg-mist border border-border-light rounded-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Condition</span>
            </button>

            <div className="flex items-center gap-2">
              {conditions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAdvanced}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate hover:text-negative transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleApplyAdvanced}
                className="px-4 py-1.5 text-xs font-semibold bg-(--color-forest) hover:bg-emerald text-white rounded-sm shadow-xs transition-colors cursor-pointer"
              >
                Apply Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
