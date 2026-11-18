'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
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
      <div className="bg-card border border-border rounded-xl p-12 text-center shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">No settlement trade audit records found</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Adjust the settlement cycle or date filters above to view trade provenance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── TREE CONTROLS ─────────────────────────────────────────────────── */}
      <div className="print:hidden flex items-center justify-between text-xs px-1">
        <span className="font-semibold text-foreground">
          {clientGroups.length} Client Account{clientGroups.length > 1 ? 's' : ''} in Audit Scope
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ─── CLIENT AUDIT CARDS ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {clientGroups.map((group) => {
          const isOpen = openGroups[group.clientId] ?? true;
          const isPnlPositive = group.subtotals.cyclePnL > 0;
          const isPnlNegative = group.subtotals.cyclePnL < 0;

          return (
            <div
              key={group.clientId}
              className="bg-card border border-border rounded-xl shadow-xs overflow-hidden"
            >
              {/* Card Header & Subtotals */}
              <button
                type="button"
                onClick={() => toggleGroup(group.clientId)}
                className="w-full text-left px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors flex flex-wrap items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-background border border-border">
                    {group.clientCode}
                  </span>
                  <span className="font-semibold text-sm text-foreground">{group.clientName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.trades.length} trade{group.trades.length > 1 ? 's' : ''})
                  </span>
                </div>

                {/* Subtotal metrics */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground mr-1.5 font-sans">Buy Val:</span>
                    <span className="font-medium text-foreground">
                      ${group.subtotals.buyValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1.5 font-sans">Sell Val:</span>
                    <span className="font-medium text-foreground">
                      ${group.subtotals.sellValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1.5 font-sans">Cycle PnL:</span>
                    <span
                      className={cn(
                        'font-bold',
                        isPnlPositive && 'text-emerald-600',
                        isPnlNegative && 'text-rose-600',
                        !isPnlPositive && !isPnlNegative && 'text-muted-foreground'
                      )}
                    >
                      {isPnlPositive ? '+' : ''}
                      ${group.subtotals.cyclePnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </button>

              {/* Nested Audit Table */}
              {isOpen && (
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground">
                        <th className="py-2 px-3 font-semibold">Date</th>
                        <th className="py-2 px-3 font-semibold">Trade No</th>
                        <th className="py-2 px-3 font-semibold">Classification</th>
                        <th className="py-2 px-3 font-semibold">Security</th>
                        <th className="py-2 px-3 font-semibold">Broker</th>
                        <th className="py-2 px-3 font-semibold text-center">Side</th>
                        <th className="py-2 px-3 font-semibold text-right">Lots</th>
                        <th className="py-2 px-3 font-semibold text-right">Lot Size</th>
                        <th className="py-2 px-3 font-semibold text-right">Units</th>
                        <th className="py-2 px-3 font-semibold text-right">Rate</th>
                        <th className="py-2 px-3 font-semibold text-right">Trade Value</th>
                        <th className="py-2 px-3 font-semibold text-right">PnL Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {group.trades.map((t) => {
                        const isBuy = t.transactionType === 'BUY';
                        const isPnlPos = t.pnl > 0;
                        const isPnlNeg = t.pnl < 0;

                        return (
                          <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">
                              {formatDateToDDMMYY(t.tradeDate)}
                            </td>
                            <td className="py-2 px-3 font-mono text-foreground font-medium">
                              {t.tradeNumber}
                            </td>
                            <td className="py-2 px-3">
                              {t.tradeType === 'REGULAR' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                                  REGULAR
                                </span>
                              )}
                              {t.tradeType === 'CARRY_FORWARD' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  CARRY FORWARD
                                </span>
                              )}
                              {t.tradeType === 'BACK_FORWARD' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                                  BACK FORWARD
                                </span>
                              )}
                              {t.tradeType === 'SETTLEMENT' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  SETTLEMENT
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono font-medium text-foreground">
                              {t.securityName}
                            </td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">
                              {t.brokerCode || '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={cn(
                                  'inline-block px-2 py-0.5 rounded font-mono text-[11px] font-bold',
                                  isBuy
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                )}
                              >
                                {t.transactionType}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground">
                              {t.quantity.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-muted-foreground">
                              {t.marketLot}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground font-medium">
                              {t.totalUnits.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground">
                              {t.rate.toFixed(4)}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground font-medium">
                              ${t.tradeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 font-mono text-right font-bold',
                                isPnlPos && 'text-emerald-600',
                                isPnlNeg && 'text-rose-600',
                                !isPnlPos && !isPnlNeg && 'text-muted-foreground'
                              )}
                            >
                              {isPnlPos ? '+' : ''}
                              ${t.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
