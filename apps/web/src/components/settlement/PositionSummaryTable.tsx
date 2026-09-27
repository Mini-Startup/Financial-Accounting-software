'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SettlementItem } from './types';

interface PositionSummaryTableProps {
  summaryData: SettlementItem[];
  loading: boolean;
  hasGenerated: boolean;
}

export function PositionSummaryTable({
  summaryData,
  loading,
  hasGenerated,
}: PositionSummaryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLIENT' | 'BROKER'>('ALL');
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [sortField, setSortField] = useState<keyof SettlementItem | 'finalPnL'>('accountCode');
  const [sortAsc, setSortAsc] = useState(true);

  // Compute finalPnL for each row
  const calculatedRows = useMemo(() => {
    return summaryData.map((item) => {
      const finalPnL =
        item.netQty === 0
          ? item.realizedPnL
          : item.closingRate !== null
          ? item.netQty * (item.closingRate - item.netAvgRate)
          : 0;
      return {
        ...item,
        finalPnL,
      };
    });
  }, [summaryData]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return calculatedRows.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.accountName.toLowerCase().includes(q) ||
        item.accountCode.toLowerCase().includes(q) ||
        item.scriptShortName.toLowerCase().includes(q) ||
        item.scriptFullName.toLowerCase().includes(q) ||
        item.exchangeCode.toLowerCase().includes(q) ||
        (item.securityName || '').toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || item.role === roleFilter;
      const matchesPosition =
        positionFilter === 'ALL'
          ? true
          : positionFilter === 'OPEN'
          ? item.netQty !== 0
          : item.netQty === 0;

      return matchesSearch && matchesRole && matchesPosition;
    });
  }, [calculatedRows, searchTerm, roleFilter, positionFilter]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      let aVal = (a as any)[sortField];
      let bVal = (b as any)[sortField];

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(String(bVal || ''));
        return sortAsc ? cmp : -cmp;
      }
      if (typeof aVal === 'number') {
        return sortAsc ? aVal - Number(bVal || 0) : Number(bVal || 0) - aVal;
      }
      return 0;
    });
    return list;
  }, [filteredRows, sortField, sortAsc]);

  const handleSort = (field: keyof SettlementItem | 'finalPnL') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSym = (item: { currencySymbol?: string; currencyCode?: string }) =>
    item.currencySymbol || (item.currencyCode === 'INR' ? '₹' : '$');

  // Visible Total Row calculation
  const totals = useMemo(() => {
    let buyQty = 0;
    let buyVal = 0;
    let sellQty = 0;
    let sellVal = 0;
    let netQty = 0;
    let netVal = 0;
    let totalPnL = 0;

    for (const r of filteredRows) {
      buyQty += r.buyQty;
      buyVal += r.buyVal;
      sellQty += r.sellQty;
      sellVal += r.sellVal;
      netQty += r.netQty;
      netVal += r.netVal;
      totalPnL += r.finalPnL || 0;
    }

    return {
      buyQty,
      buyVal,
      sellQty,
      sellVal,
      netQty,
      netVal,
      totalPnL,
    };
  }, [filteredRows]);

  const renderSortIndicator = (field: keyof SettlementItem | 'finalPnL') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 inline ml-1" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-emerald-600 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-600 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search party code, name, script, exchange..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 text-xs w-full py-1.5"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="input text-xs py-1.5 px-2.5 w-32 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="CLIENT">Clients Only</option>
            <option value="BROKER">Brokers Only</option>
          </select>

          {/* Position Filter */}
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value as any)}
            className="input text-xs py-1.5 px-2.5 w-36 cursor-pointer"
          >
            <option value="ALL">All Positions</option>
            <option value="OPEN">Open (Net ≠ 0)</option>
            <option value="CLOSED">Closed (Net = 0)</option>
          </select>

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
            {filteredRows.length} rows
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-xs border border-slate-200 rounded-xl bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs" style={{ minWidth: '1350px' }}>
            <thead>
              <tr className="whitespace-nowrap bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] select-none">
                <th onClick={() => handleSort('accountCode')} className="cursor-pointer py-3 px-3">
                  Party Code &amp; Name {renderSortIndicator('accountCode')}
                </th>
                <th onClick={() => handleSort('role')} className="cursor-pointer py-3 px-3">
                  Role {renderSortIndicator('role')}
                </th>
                <th onClick={() => handleSort('exchangeCode')} className="cursor-pointer py-3 px-3">
                  Exchange {renderSortIndicator('exchangeCode')}
                </th>
                <th onClick={() => handleSort('scriptShortName')} className="cursor-pointer py-3 px-3 min-w-[200px]">
                  Script / Security {renderSortIndicator('scriptShortName')}
                </th>
                <th className="py-3 px-3">Expiry</th>
                <th onClick={() => handleSort('buyQty')} className="text-right cursor-pointer py-3 px-3">
                  Buy Qty {renderSortIndicator('buyQty')}
                </th>
                <th className="text-right py-3 px-3">Buy Avg</th>
                <th onClick={() => handleSort('sellQty')} className="text-right cursor-pointer py-3 px-3">
                  Sell Qty {renderSortIndicator('sellQty')}
                </th>
                <th className="text-right py-3 px-3">Sell Avg</th>
                <th onClick={() => handleSort('netQty')} className="text-right cursor-pointer py-3 px-3 font-bold">
                  Net Qty {renderSortIndicator('netQty')}
                </th>
                <th className="text-right py-3 px-3">Net Avg</th>
                <th className="text-right py-3 px-3">Closing Rate</th>
                <th onClick={() => handleSort('finalPnL')} className="text-right cursor-pointer py-3 px-3 font-bold min-w-[120px]">
                  Final P&amp;L {renderSortIndicator('finalPnL')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 italic">
                    Loading position summary…
                  </td>
                </tr>
              ) : !hasGenerated && sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 italic">
                    Select a cutoff date and click &quot;Generate Summary&quot; to review position calculations.
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 italic">
                    No position records matching active filters.
                  </td>
                </tr>
              ) : (
                sortedRows.map((item, idx) => {
                  const currSym = getSym(item);
                  const isNetOpen = item.netQty !== 0;
                  const pnl = item.finalPnL || 0;

                  return (
                    <tr
                      key={`${item.accountId}_${item.scriptId}_${idx}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Party */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">{item.accountCode}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={item.accountName}>
                          {item.accountName}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                            item.role === 'CLIENT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          )}
                        >
                          {item.role}
                        </span>
                      </td>

                      {/* Exchange */}
                      <td className="py-2.5 px-3 font-bold text-slate-700">{item.exchangeCode}</td>

                      {/* Script / Security */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.scriptShortName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]" title={item.securityName || item.scriptFullName}>
                          {item.securityName || item.scriptFullName}
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {item.expiry || '—'}
                      </td>

                      {/* Buy Qty & Avg */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                        {item.buyQty > 0 ? item.buyQty.toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {item.buyQty > 0 ? `${currSym}${item.buyAvgRate.toFixed(2)}` : '—'}
                      </td>

                      {/* Sell Qty & Avg */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-700">
                        {item.sellQty > 0 ? item.sellQty.toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {item.sellQty > 0 ? `${currSym}${item.sellAvgRate.toFixed(2)}` : '—'}
                      </td>

                      {/* Net Qty & Avg */}
                      <td
                        className={cn(
                          'py-2.5 px-3 text-right font-mono font-bold',
                          item.netQty > 0
                            ? 'text-emerald-700'
                            : item.netQty < 0
                            ? 'text-rose-700'
                            : 'text-slate-400'
                        )}
                      >
                        {item.netQty !== 0 ? item.netQty.toLocaleString('en-IN') : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {isNetOpen ? `${currSym}${item.netAvgRate.toFixed(2)}` : '—'}
                      </td>

                      {/* Closing Rate */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {item.closingRate !== null ? (
                          `${currSym}${item.closingRate.toFixed(2)}`
                        ) : isNetOpen ? (
                          <span className="text-amber-600 font-semibold" title="Missing closing rate">
                            Missing
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Final P&L */}
                      <td
                        className={cn(
                          'py-2.5 px-3 text-right font-mono font-bold',
                          pnl > 0
                            ? 'text-[var(--color-positive)]'
                            : pnl < 0
                            ? 'text-[var(--color-negative)]'
                            : 'text-slate-500'
                        )}
                      >
                        {pnl > 0 ? '+' : ''}
                        {currSym}
                        {Math.abs(pnl).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Sticky Total Summary Row (visible rows only) */}
            {sortedRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-mono text-xs font-bold text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={5} className="py-3 px-3 uppercase tracking-wider text-slate-700 font-sans">
                    Total ({filteredRows.length} visible rows)
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700">
                    {totals.buyQty.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">—</td>
                  <td className="py-3 px-3 text-right text-rose-700">
                    {totals.sellQty.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">—</td>
                  <td
                    className={cn(
                      'py-3 px-3 text-right',
                      totals.netQty > 0
                        ? 'text-emerald-700'
                        : totals.netQty < 0
                        ? 'text-rose-700'
                        : 'text-slate-900'
                    )}
                  >
                    {totals.netQty.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">—</td>
                  <td className="py-3 px-3 text-right text-slate-500">—</td>
                  <td
                    className={cn(
                      'py-3 px-3 text-right font-bold',
                      totals.totalPnL > 0
                        ? 'text-[var(--color-positive)]'
                        : totals.totalPnL < 0
                        ? 'text-[var(--color-negative)]'
                        : 'text-slate-900'
                    )}
                  >
                    {totals.totalPnL >= 0 ? '+' : '-'}
                    {Math.abs(totals.totalPnL).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
