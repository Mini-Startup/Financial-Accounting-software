'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, Layers, TrendingUp, User, FileCode, Briefcase } from 'lucide-react';
import { NetPositionGroup, NetPositionItem } from './types';
import { cn } from '@/utils/cn';

export interface NetPositionTableProps {
  groups: NetPositionGroup[];
}

export function NetPositionTable({ groups }: NetPositionTableProps) {
  // State tracking open group keys; all open by default
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) {
      initial[g.id] = true;
    }
    return initial;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const g of groups) all[g.id] = true;
    setOpenGroups(all);
  };

  const collapseAll = () => {
    setOpenGroups({});
  };

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8] mx-auto mb-3 shadow-2xs">
          <Layers className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-800">No Open Positions Found</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          All positions in the selected scope are fully settled or closed.
        </p>
      </div>
    );
  }

  const category = groups[0]?.category || 'CLIENT';

  return (
    <div className="space-y-4">
      {/* ── Control Header ────────────────────────────────────────────── */}
      <div className="print:hidden px-4 py-2.5 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="font-semibold text-slate-900">
            {groups.length} {category.toLowerCase()} group{groups.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-[#2652C8] hover:underline font-semibold cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-[#2652C8] hover:underline font-semibold cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Groups List ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {groups.map((group) => {
          const isOpen = openGroups[group.id] ?? true;
          const isGroupPnlPositive = group.totals.unrealizedPnL > 0;
          const isGroupPnlNegative = group.totals.unrealizedPnL < 0;

          return (
            <div 
              key={group.id} 
              className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all"
            >
              {/* Group Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full text-left px-5 py-3.5 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-200/80 transition-colors flex flex-wrap items-center justify-between gap-3 cursor-pointer"
              >
                {/* Left: Dimension-specific title info */}
                <div className="flex items-center gap-3 min-w-[240px]">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}

                  {group.category === 'SCRIPT' ? (
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500 uppercase tracking-wide">Name :</span>
                        <span className="font-bold text-slate-900 text-sm">{group.name}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500 uppercase tracking-wide">LotSize :</span>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {group.lotSize || 1}
                        </span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500 uppercase tracking-wide">Code :</span>
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {group.code}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500 uppercase tracking-wide">Name :</span>
                        <span className="font-bold text-slate-900 text-sm">{group.name}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500 uppercase tracking-wide">Code :</span>
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {group.code}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        ({group.positions.length} position{group.positions.length > 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Summary badges */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 mr-1.5 font-sans font-medium">Net Qty:</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md font-bold text-xs font-mono',
                        group.totals.netQty > 0 && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                        group.totals.netQty < 0 && 'bg-rose-50 text-rose-700 border border-rose-200',
                        group.totals.netQty === 0 && 'bg-slate-100 text-slate-600 border border-slate-200'
                      )}
                    >
                      {group.totals.netQty > 0 
                        ? `+${group.totals.netQty.toLocaleString('en-IN')}` 
                        : group.totals.netQty.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 mr-1 font-sans font-medium">Mkt Val:</span>
                    <span className="font-bold text-slate-900">
                      ₹{group.totals.marketValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 mr-1 font-sans font-medium">MTM PnL:</span>
                    <span
                      className={cn(
                        'font-bold',
                        isGroupPnlPositive && 'text-emerald-700',
                        isGroupPnlNegative && 'text-rose-700',
                        !isGroupPnlPositive && !isGroupPnlNegative && 'text-slate-600'
                      )}
                    >
                      {isGroupPnlPositive ? '+' : ''}
                      ₹{group.totals.unrealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </button>

              {/* Group Positions Table */}
              {isOpen && (
                <div className="bg-white">
                  {group.category === 'SCRIPT' ? (
                    /* ── SCRIPT-WISE LAYOUT (Matching Old Reference Image) ──────── */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-4">Client Name</th>
                            <th className="py-2.5 px-3">Exchange</th>
                            <th className="py-2.5 px-3">Expiry Date</th>
                            <th className="py-2.5 px-3">Code</th>
                            <th className="py-2.5 px-4 text-right">NetQ (FF)</th>
                            <th className="py-2.5 px-4 text-right">Average Strike</th>
                            <th className="py-2.5 px-4 text-right">Net Lot</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {group.positions.map((pos, pIdx) => {
                            const isPositive = pos.netQty > 0;
                            const isNegative = pos.netQty < 0;

                            return (
                              <tr key={pIdx} className="hover:bg-blue-50/30 transition-colors">
                                <td className="py-2.5 px-4 font-semibold text-slate-900">
                                  {pos.clientName || 'Unnamed Client'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {pos.exchangeCode || 'MCX'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                                  {pos.expiryFormatted || '—'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {pos.clientCode || 'N/A'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold">
                                  <span
                                    className={cn(
                                      isPositive && 'text-emerald-700',
                                      isNegative && 'text-rose-700',
                                      !isPositive && !isNegative && 'text-slate-600'
                                    )}
                                  >
                                    {isPositive ? `+${pos.netQty}` : pos.netQty}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                                  {pos.netAvgRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                  {pos.netLot ?? pos.netQty}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Script Totals Footer */}
                        <tfoot>
                          <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-900">
                            <td colSpan={4} className="py-3 px-4 text-slate-600 uppercase tracking-wide">
                              Total For {group.name} :
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span
                                className={cn(
                                  group.totals.netQty > 0 && 'text-emerald-700',
                                  group.totals.netQty < 0 && 'text-rose-700',
                                  group.totals.netQty === 0 && 'text-slate-700'
                                )}
                              >
                                {group.totals.netQty > 0 ? `+${group.totals.netQty}` : group.totals.netQty}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">—</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-900">
                              {group.totals.netQty}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    /* ── CLIENT-WISE LAYOUT (Matching Old Reference Image) ──────── */
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                              <th className="py-2.5 px-4">Script Name</th>
                              <th className="py-2.5 px-3">Expiry Date</th>
                              <th className="py-2.5 px-4 text-right">NetQ</th>
                              <th className="py-2.5 px-4 text-right">Net Lot</th>
                              <th className="py-2.5 px-4 text-right">Rate</th>
                              <th className="py-2.5 px-4 text-right">Cl Rate</th>
                              <th className="py-2.5 px-4 text-right">M-to-M Diff</th>
                              <th className="py-2.5 px-4 text-right">Profit / Loss</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                            {group.positions.map((pos, pIdx) => {
                              const isPositive = pos.netQty > 0;
                              const isNegative = pos.netQty < 0;
                              const isPnlPositive = pos.unrealizedPnL > 0;
                              const isPnlNegative = pos.unrealizedPnL < 0;

                              return (
                                <tr key={pIdx} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="py-2.5 px-4">
                                    <div className="font-semibold text-slate-900">{pos.scriptFullName}</div>
                                    <div className="text-[11px] font-mono text-slate-400">{pos.securityName}</div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                                    {pos.expiryFormatted || '—'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold">
                                    <span
                                      className={cn(
                                        isPositive && 'text-emerald-700',
                                        isNegative && 'text-rose-700',
                                        !isPositive && !isNegative && 'text-slate-600'
                                      )}
                                    >
                                      {isPositive ? `+${pos.netQty}` : pos.netQty}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                                    {pos.netLot ?? pos.netQty}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                                    {pos.netAvgRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                                    {pos.closingRate != null 
                                      ? pos.closingRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      : <span className="text-amber-600 font-semibold text-[11px]">Pending</span>}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono">
                                    <span className={cn(pos.mtmDiff && pos.mtmDiff > 0 ? 'text-emerald-700' : pos.mtmDiff && pos.mtmDiff < 0 ? 'text-rose-700' : 'text-slate-600')}>
                                      {pos.mtmDiff ? pos.mtmDiff.toFixed(2) : '0.00'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold">
                                    <span
                                      className={cn(
                                        isPnlPositive && 'text-emerald-700',
                                        isPnlNegative && 'text-rose-700',
                                        !isPnlPositive && !isPnlNegative && 'text-slate-600'
                                      )}
                                    >
                                      {isPnlPositive ? '+' : ''}
                                      {pos.unrealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Client Financial Summary Strip (Matching Old Reference Image) ── */}
                      {group.financialSummary && (
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono font-bold text-slate-700">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">Exposure:</span>
                              <span className="text-slate-900">₹{group.financialSummary.exposure.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">+ Expo:</span>
                              <span className="text-emerald-700">₹{group.financialSummary.positiveExposure.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">- Expo:</span>
                              <span className="text-rose-700">₹{group.financialSummary.negativeExposure.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">NetQ:</span>
                              <span className="text-slate-900">{group.financialSummary.netQ}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">Total M-to-M:</span>
                              <span className={cn(group.financialSummary.totalMtm >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                                ₹{group.financialSummary.totalMtm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">Total Margin:</span>
                              <span className="text-slate-900">₹{group.financialSummary.totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">A/c Balance:</span>
                              <span className="text-slate-900">₹{group.financialSummary.accountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                              <span className="text-slate-500 font-sans font-medium mr-1">Outstanding:</span>
                              <span className="text-[#2652C8]">₹{group.financialSummary.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
