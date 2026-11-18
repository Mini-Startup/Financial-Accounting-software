'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { NetPositionGroup, NetPositionItem } from './types';
import { cn } from '@/utils/cn';

// Types mirror API response
export interface NetPositionTableProps {
  groups: Array<{
    id: string;
    code: string;
    name: string;
    category: 'CLIENT' | 'BROKER' | 'SCRIPT';
    totals: {
      buyQty: number;
      sellQty: number;
      netQty: number;
      totalUnits: number;
      marketValue: number;
      unrealizedPnL: number;
    };
    positions: Array<{
      securityName: string;
      scriptId: string;
      scriptShortName: string;
      scriptFullName: string;
      exchangeId: string;
      exchangeCode: string;
      currencyCode: string;
      currencySymbol: string;
      expiry: string | null;
      expiryFormatted: string;
      marketLot: number;
      buyQty: number;
      buyAvgRate: number;
      sellQty: number;
      sellAvgRate: number;
      netQty: number;
      totalUnits: number;
      netAvgRate: number;
      closingRate: number | null;
      marketValue: number;
      unrealizedPnL: number;
      isMissingRate: boolean;
    }>;
  }>;
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
      <div className="bg-card border border-border rounded-xl p-12 text-center shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">No open positions found</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          All trades in the selected scope are fully settled.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* ─── TREE CONTROL TOOLBAR ─────────────────────────────────────────── */}
      <div className="print:hidden px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {groups.length} {groups[0]?.category.toLowerCase() || 'entity'} group{groups.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ─── EXPANDABLE GROUPS LIST ───────────────────────────────────────── */}
      <div className="divide-y divide-border">
        {groups.map((group) => {
          const isOpen = openGroups[group.id] ?? true;
          const isGroupPnlPositive = group.totals.unrealizedPnL > 0;
          const isGroupPnlNegative = group.totals.unrealizedPnL < 0;

          return (
            <div key={group.id} className="group-container">
              {/* Group Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full text-left px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors flex flex-wrap items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-[200px]">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                    {group.code}
                  </span>
                  <span className="font-semibold text-sm text-foreground">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.positions.length} position{group.positions.length > 1 ? 's' : ''})
                  </span>
                </div>

                {/* Group Summary Badges */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground mr-1.5 font-sans">Net Qty:</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded font-semibold text-xs',
                        group.totals.netQty > 0 && 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                        group.totals.netQty < 0 && 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
                        group.totals.netQty === 0 && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {group.totals.netQty > 0 ? `+${group.totals.netQty} Long` : group.totals.netQty < 0 ? `${group.totals.netQty} Short` : '0 Flat'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground mr-1 font-sans">Mkt Value:</span>
                    <span className="font-semibold text-foreground">
                      ${group.totals.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground mr-1 font-sans">MTM PnL:</span>
                    <span
                      className={cn(
                        'font-bold',
                        isGroupPnlPositive && 'text-emerald-600',
                        isGroupPnlNegative && 'text-rose-600',
                        !isGroupPnlPositive && !isGroupPnlNegative && 'text-muted-foreground'
                      )}
                    >
                      {isGroupPnlPositive ? '+' : ''}
                      ${group.totals.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </button>

              {/* Group Positions Table */}
              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground border-y border-border">
                        <th className="py-2 px-3 font-semibold">Security Name</th>
                        <th className="py-2 px-3 font-semibold">Expiry</th>
                        <th className="py-2 px-3 font-semibold text-right">Buy Qty</th>
                        <th className="py-2 px-3 font-semibold text-right">Buy Avg</th>
                        <th className="py-2 px-3 font-semibold text-right">Sell Qty</th>
                        <th className="py-2 px-3 font-semibold text-right">Sell Avg</th>
                        <th className="py-2 px-3 font-semibold text-center">Net Qty</th>
                        <th className="py-2 px-3 font-semibold text-right">Lot</th>
                        <th className="py-2 px-3 font-semibold text-right">Units</th>
                        <th className="py-2 px-3 font-semibold text-right">Net Avg</th>
                        <th className="py-2 px-3 font-semibold text-right">Closing Rate</th>
                        <th className="py-2 px-3 font-semibold text-right">Market Value</th>
                        <th className="py-2 px-3 font-semibold text-right">MTM PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {group.positions.map((pos, pIdx) => {
                        const isPosPnlPositive = pos.unrealizedPnL > 0;
                        const isPosPnlNegative = pos.unrealizedPnL < 0;

                        return (
                          <tr
                            key={`${group.id}_${pos.securityName}_${pIdx}`}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="py-2 px-3 font-mono font-medium text-foreground">
                              {pos.securityName}
                            </td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">
                              {pos.expiryFormatted || '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground">
                              {pos.buyQty.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-muted-foreground">
                              {pos.buyAvgRate > 0 ? pos.buyAvgRate.toFixed(4) : '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground">
                              {pos.sellQty.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-muted-foreground">
                              {pos.sellAvgRate > 0 ? pos.sellAvgRate.toFixed(4) : '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={cn(
                                  'inline-block px-2 py-0.5 rounded font-mono text-[11px] font-semibold',
                                  pos.netQty > 0 && 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                                  pos.netQty < 0 && 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
                                  pos.netQty === 0 && 'bg-muted text-muted-foreground'
                                )}
                              >
                                {pos.netQty > 0 ? `+${pos.netQty}` : pos.netQty}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-muted-foreground">
                              {pos.marketLot}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground font-medium">
                              {pos.totalUnits.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground">
                              {pos.netAvgRate > 0 ? pos.netAvgRate.toFixed(4) : '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-right">
                              {pos.isMissingRate || pos.closingRate === null ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-sans font-medium">
                                  <AlertCircle className="w-3 h-3" />
                                  Pending
                                </span>
                              ) : (
                                <span className="text-foreground">{pos.closingRate.toFixed(4)}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-foreground font-medium">
                              ${pos.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 font-mono text-right font-bold',
                                isPosPnlPositive && 'text-emerald-600',
                                isPosPnlNegative && 'text-rose-600',
                                !isPosPnlPositive && !isPosPnlNegative && 'text-muted-foreground'
                              )}
                            >
                              {pos.isMissingRate ? (
                                '-'
                              ) : (
                                `${isPosPnlPositive ? '+' : ''}$${pos.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              )}
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
