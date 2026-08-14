'use client';

import { useState, useMemo } from 'react';
import { Search, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface PositionVerificationItem {
  clientCode: string;
  securityName: string;
  commodityCode?: string;
  exchangeCode?: string;
  systemNetQty: number;
  csvNetQty: number;
  diff: number;
  isValid: boolean;
  isUnmappedScript?: boolean;
  reason: string;
}

export function OpenPositionVerificationPanel({
  items,
  isValidated,
  onAddScript,
}: {
  items: PositionVerificationItem[];
  isValidated: boolean;
  onAddScript?: (commodityCode: string, securityName?: string, exchangeCode?: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'VALID' | 'MISMATCH'>('ALL');

  const validCount = useMemo(() => items.filter((i) => i.isValid).length, [items]);
  const mismatchCount = useMemo(() => items.filter((i) => !i.isValid).length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.clientCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.securityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        filterTab === 'ALL' ||
        (filterTab === 'VALID' && item.isValid) ||
        (filterTab === 'MISMATCH' && !item.isValid);

      return matchesSearch && matchesTab;
    });
  }, [items, searchQuery, filterTab]);

  return (
    <div
      className={cn(
        'card border shadow-sm p-5 space-y-4 rounded-xl',
        isValidated ? 'bg-emerald-50/30 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          {isValidated ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Open Position Verification ({items.length} Positions)
            </h3>
            <p className="text-xs text-slate-500">
              Cross-referencing system open positions with uploaded file positions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {validCount} Matched
          </span>
          {mismatchCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              {mismatchCount} Mismatches
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party code or security..."
            className="input pl-9 text-xs py-1.5 w-full bg-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={cn(
              'px-3 py-1 rounded-md font-semibold transition-all cursor-pointer',
              filterTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('VALID')}
            className={cn(
              'px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer',
              filterTab === 'VALID'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            )}
          >
            ✓ Matched ({validCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('MISMATCH')}
            className={cn(
              'px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer',
              filterTab === 'MISMATCH'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            )}
          >
            ⚠️ Mismatches ({mismatchCount})
          </button>
        </div>
      </div>

      {/* Verification Table */}
      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-xs max-h-[420px] overflow-y-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Status</th>
              <th className="p-2.5">Party / Client</th>
              <th className="p-2.5">Security Name</th>
              <th className="p-2.5 text-right">System Net Qty</th>
              <th className="p-2.5 text-right">CSV Net Qty</th>
              <th className="p-2.5 text-right">Variance</th>
              <th className="p-2.5">Reason / Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                  No open positions match your search query or selected filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'transition-colors',
                    item.isValid ? 'hover:bg-emerald-50/40' : 'bg-rose-50/30 hover:bg-rose-50/70'
                  )}
                >
                  <td className="p-2.5">
                    {item.isValid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Matched
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Mismatch
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-900">{item.clientCode}</td>
                  <td className="p-2.5 font-mono text-slate-700 font-semibold">{item.securityName}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    {item.systemNetQty}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                    {item.csvNetQty}
                  </td>
                  <td
                    className={cn(
                      'p-2.5 text-right font-mono font-bold',
                      item.diff === 0 ? 'text-emerald-600' : 'text-rose-600'
                    )}
                  >
                    {item.diff > 0 ? `+${item.diff}` : item.diff}
                  </td>
                  <td
                    className={cn(
                      'p-2.5 font-medium text-xs',
                      item.isValid ? 'text-emerald-700 italic' : 'text-rose-700 font-semibold'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{item.reason}</span>
                      {(item.isUnmappedScript || (!item.isValid && item.commodityCode)) && onAddScript && (
                        <button
                          type="button"
                          onClick={() => onAddScript(item.commodityCode!, item.securityName, item.exchangeCode)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer transition-colors shrink-0"
                          title={`Add script '${item.commodityCode}' to database`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Script</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
