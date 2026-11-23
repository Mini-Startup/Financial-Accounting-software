'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User, Scale } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

export interface SettlementAuditTradeItem {
  id: string;
  tradeNumber: string;
  tradeDate: string; // Strictly "DD-MM-YY"
  tradeType: 'REGULAR' | 'CARRY_FORWARD' | 'BACK_FORWARD' | 'SETTLEMENT';
  brokerCode: string | null;
  brokerName: string | null;
  securityName: string;
  transactionType: 'BUY' | 'SELL';
  quantity: number;
  marketLot: number;
  totalUnits: number;
  rate: number;
  settlementRate: number | null;
  tradeValue: number;
  pnl: number;
  remarks: string | null;
}

export interface SettlementAuditClientGroup {
  clientId: string;
  clientCode: string;
  clientName: string;
  subtotals: {
    buyQty: number;
    sellQty: number;
    netQty: number;
    buyValue: number;
    sellValue: number;
    cyclePnL: number;
  };
  trades: SettlementAuditTradeItem[];
}

export interface SettlementAuditTableProps {
  clientGroups: SettlementAuditClientGroup[];
}

export function SettlementAuditTable({ clientGroups }: SettlementAuditTableProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of clientGroups) {
      initial[g.clientId] = true;
    }
    return initial;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const g of clientGroups) all[g.clientId] = true;
    setOpenGroups(all);
  };

  const collapseAll = () => {
    setOpenGroups({});
  };

  if (!clientGroups || clientGroups.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8] mx-auto mb-3 shadow-2xs">
          <Scale className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-800">No Settlement Trade Audit Records Found</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Adjust the settlement cycle or date filters above to view trade provenance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── TREE CONTROLS ─────────────────────────────────────────────────── */}
      <div className="print:hidden px-4 py-2.5 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="font-semibold text-slate-900">
            {clientGroups.length} Client Account{clientGroups.length > 1 ? 's' : ''} in Audit Scope
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

      {/* ─── CLIENT AUDIT CARDS ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {clientGroups.map((group) => {
          const isOpen = openGroups[group.clientId] ?? true;
          const isPnlPositive = group.subtotals.cyclePnL > 0;
          const isPnlNegative = group.subtotals.cyclePnL < 0;

          return (
            <div
              key={group.clientId}
              className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all"
            >
              {/* Card Header & Subtotals */}
              <button
                type="button"
                onClick={() => toggleGroup(group.clientId)}
                className="w-full text-left px-5 py-3.5 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-200/80 transition-colors flex flex-wrap items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {group.clientCode}
                  </span>
                  <span className="font-bold text-sm text-slate-900">{group.clientName}</span>
                  <span className="text-xs text-slate-400 font-medium">
                    ({group.trades.length} trade{group.trades.length > 1 ? 's' : ''})
                  </span>
                </div>

                {/* Subtotal metrics */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 mr-1.5 font-sans font-medium">Buy Val:</span>
                    <span className="font-bold text-slate-900">
                      ₹{group.subtotals.buyValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-1.5 font-sans font-medium">Sell Val:</span>
                    <span className="font-bold text-slate-900">
                      ₹{group.subtotals.sellValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-1.5 font-sans font-medium">Cycle PnL:</span>
                    <span
                      className={cn(
                        'font-bold',
                        isPnlPositive && 'text-emerald-700',
                        isPnlNegative && 'text-rose-700',
                        !isPnlPositive && !isPnlNegative && 'text-slate-600'
                      )}
                    >
                      {isPnlPositive ? '+' : ''}
                      ₹{group.subtotals.cyclePnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </button>

              {/* Nested Audit Table */}
              {isOpen && (
                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-3">Trade No</th>
                        <th className="py-2.5 px-3">Classification</th>
                        <th className="py-2.5 px-3">Security</th>
                        <th className="py-2.5 px-3">Broker</th>
                        <th className="py-2.5 px-3 text-center">Side</th>
                        <th className="py-2.5 px-3 text-right">Lots</th>
                        <th className="py-2.5 px-3 text-right">Lot Size</th>
                        <th className="py-2.5 px-3 text-right">Units</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-4 text-right">Trade Value</th>
                        <th className="py-2.5 px-4 text-right">PnL Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {group.trades.map((t) => {
                        const isBuy = t.transactionType === 'BUY';
                        const isPnlPos = t.pnl > 0;
                        const isPnlNeg = t.pnl < 0;

                        return (
                          <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {formatDateToDDMMYY(t.tradeDate)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-900 font-semibold">
                              {t.tradeNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              {t.tradeType === 'REGULAR' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                  REGULAR
                                </span>
                              )}
                              {t.tradeType === 'CARRY_FORWARD' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  CARRY FORWARD
                                </span>
                              )}
                              {t.tradeType === 'BACK_FORWARD' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  BACK FORWARD
                                </span>
                              )}
                              {t.tradeType === 'SETTLEMENT' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  SETTLEMENT
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              {t.securityName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {t.brokerCode || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={cn(
                                  'inline-block px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border',
                                  isBuy
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                )}
                              >
                                {t.transactionType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-slate-900">
                              {t.quantity.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-slate-500">
                              {t.marketLot}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-slate-900 font-semibold">
                              {t.totalUnits.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-slate-900">
                              {t.rate.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-right text-slate-900 font-semibold">
                              ₹{t.tradeValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td
                              className={cn(
                                'py-2.5 px-4 font-mono text-right font-bold',
                                isPnlPos && 'text-emerald-700',
                                isPnlNeg && 'text-rose-700',
                                !isPnlPos && !isPnlNeg && 'text-slate-600'
                              )}
                            >
                              {isPnlPos ? '+' : ''}
                              ₹{t.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
