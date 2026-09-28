'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { UniversalDropdown } from '../ui/UniversalDropdown';

interface SettledTradesTableProps {
  trades: any[];
}

export function SettledTradesTable({ trades }: SettledTradesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const tradeTypeOptions = [
    { value: 'ALL', label: 'All Trade Types' },
    { value: 'CARRY_FORWARD', label: 'Carry Forward (CF)' },
    { value: 'BACK_FORWARD', label: 'Backforward (BF)' },
    { value: 'SETTLEMENT', label: 'Settlement' },
    { value: 'INTERNAL', label: 'Internal Trade' },
    { value: 'REGULAR', label: 'Regular / Import' },
  ];

  const actionOptions = [
    { value: 'ALL', label: 'Buy & Sell' },
    { value: 'BUY', label: 'BUY' },
    { value: 'SELL', label: 'SELL' },
  ];

  const filteredTrades = useMemo(() => {
    return (trades || []).filter((t: any) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (t.tradeNumber || '').toLowerCase().includes(q) ||
        (t.account?.code || '').toLowerCase().includes(q) ||
        (t.account?.name || '').toLowerCase().includes(q) ||
        (t.broker?.code || '').toLowerCase().includes(q) ||
        (t.broker?.name || '').toLowerCase().includes(q) ||
        (t.securityName || '').toLowerCase().includes(q) ||
        (t.script?.shortName || '').toLowerCase().includes(q) ||
        (t.script?.fullName || '').toLowerCase().includes(q);

      const matchesType = typeFilter === 'ALL' || t.tradeType === typeFilter;
      const matchesAction = actionFilter === 'ALL' || t.transactionType === actionFilter;

      return matchesSearch && matchesType && matchesAction;
    });
  }, [trades, searchTerm, typeFilter, actionFilter]);

  // Totals for visible rows
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalVal = 0;
    for (const t of filteredTrades) {
      totalQty += Number(t.quantity || 0);
      totalVal += Number(t.quantity || 0) * Number(t.rate || 0);
    }
    return { totalQty, totalVal };
  }, [filteredTrades]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trade #, party, broker, security..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 text-xs w-full py-1.5"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Trade Type Filter */}
          <div className="w-44">
            <UniversalDropdown
              value={typeFilter}
              options={tradeTypeOptions}
              onChange={(val) => setTypeFilter(val)}
              placeholder="All Trade Types"
            />
          </div>

          {/* Action Filter */}
          <div className="w-32">
            <UniversalDropdown
              value={actionFilter}
              options={actionOptions}
              onChange={(val) => setActionFilter(val as any)}
              placeholder="Buy & Sell"
            />
          </div>

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
            {filteredTrades.length} trades
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-xs border border-slate-200 rounded-xl bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs" style={{ minWidth: '1100px' }}>
            <thead>
              <tr className="whitespace-nowrap bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] select-none">
                <th className="py-3 px-3">Trade #</th>
                <th className="py-3 px-3">Trade Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Party</th>
                <th className="py-3 px-3">Broker</th>
                <th className="py-3 px-3 min-w-[200px]">Security Name</th>
                <th className="py-3 px-3 text-center">Side</th>
                <th className="py-3 px-3 text-right">Quantity</th>
                <th className="py-3 px-3 text-right">Rate</th>
                <th className="py-3 px-3 text-right font-bold">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                    No settled trades found matching active filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t: any, idx: number) => {
                  const currSym = t.script?.currency?.symbol || '₹';
                  const amount = Number(t.quantity || 0) * Number(t.rate || 0);

                  return (
                    <tr key={t.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {t.tradeNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {new Date(t.tradeDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border',
                            t.tradeType === 'CARRY_FORWARD' && 'bg-amber-50 text-amber-800 border-amber-200',
                            t.tradeType === 'BACK_FORWARD' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
                            t.tradeType === 'SETTLEMENT' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            (!t.tradeType || t.tradeType === 'REGULAR') && 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          {t.tradeType === 'CARRY_FORWARD'
                            ? 'Carry Forward'
                            : t.tradeType === 'BACK_FORWARD'
                            ? 'Backforward'
                            : t.tradeType === 'SETTLEMENT'
                            ? 'Settlement'
                            : t.tradeType || 'Regular'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">{t.account?.code}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]" title={t.account?.name}>
                          {t.account?.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-slate-800">{t.broker?.code || '—'}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{t.securityName || t.script?.shortName}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold',
                            t.transactionType === 'BUY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {t.transactionType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {t.quantity?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {currSym}{Number(t.rate || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {currSym}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Sticky Total Row for visible rows */}
            {filteredTrades.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-mono text-xs font-bold text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={7} className="py-3 px-3 uppercase tracking-wider text-slate-700 font-sans">
                    Total ({filteredTrades.length} settled trades)
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {totals.totalQty.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">—</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {totals.totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
