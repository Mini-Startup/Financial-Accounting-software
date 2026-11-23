'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Briefcase } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface BrokerSummaryRow {
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  buyQty: number;
  sellQty: number;
  buyValue: number;
  sellValue: number;
  netTradingAmount: number;
  charges: number;
  netAmount: number;
  type: 'Dr' | 'Cr' | 'Nil';
  ledgerStatus: 'POSTED' | 'UNPOSTED' | 'DISCREPANCY';
  ledgerAmount?: number;
}

export interface BrokerSummarySectionProps {
  totals: {
    totalBuyValue: number;
    totalSellValue: number;
    netTradingAmount: number;
    totalCharges: number;
    netPayable: number;
    netReceivable: number;
    netSettlementAmount: number;
  };
  rows: BrokerSummaryRow[];
}

export function BrokerSummarySection({ totals, rows }: BrokerSummarySectionProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">No broker clearing records for this cycle</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-muted/20 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h2 className="text-sm font-bold text-foreground">Section 2: Broker Settlement Clearing</h2>
          <span className="text-xs text-muted-foreground">({rows.length} brokers)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b border-border">
              <th className="py-2.5 px-3 font-semibold">Broker Code</th>
              <th className="py-2.5 px-3 font-semibold">Broker Name</th>
              <th className="py-2.5 px-3 font-semibold text-right">Buy Qty</th>
              <th className="py-2.5 px-3 font-semibold text-right">Buy Value</th>
              <th className="py-2.5 px-3 font-semibold text-right">Sell Qty</th>
              <th className="py-2.5 px-3 font-semibold text-right">Sell Value</th>
              <th className="py-2.5 px-3 font-semibold text-right">Net Trades</th>
              <th className="py-2.5 px-3 font-semibold text-right">Charges</th>
              <th className="py-2.5 px-3 font-semibold text-right">Net Amount</th>
              <th className="py-2.5 px-3 font-semibold text-center">Type</th>
              <th className="py-2.5 px-3 font-semibold text-center">Ledger Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => {
              const isNetTradesPos = row.netTradingAmount > 0;
              const isNetTradesNeg = row.netTradingAmount < 0;
              const isNetPos = row.netAmount > 0;
              const isNetNeg = row.netAmount < 0;

              return (
                <tr key={row.brokerId} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-3 font-mono font-bold text-foreground">
                    {row.brokerCode}
                  </td>
                  <td className="py-2 px-3 font-medium text-foreground">
                    {row.brokerName}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-foreground">
                    {row.buyQty.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-foreground">
                    ${row.buyValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-foreground">
                    {row.sellQty.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-foreground">
                    ${row.sellValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td
                    className={cn(
                      'py-2 px-3 font-mono text-right font-medium',
                      isNetTradesPos && 'text-emerald-600',
                      isNetTradesNeg && 'text-rose-600',
                      !isNetTradesPos && !isNetTradesNeg && 'text-muted-foreground'
                    )}
                  >
                    {isNetTradesPos ? '+' : ''}
                    ${row.netTradingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-muted-foreground">
                    ${row.charges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td
                    className={cn(
                      'py-2 px-3 font-mono text-right font-bold',
                      isNetPos && 'text-emerald-600',
                      isNetNeg && 'text-rose-600',
                      !isNetPos && !isNetNeg && 'text-muted-foreground'
                    )}
                  >
                    {isNetPos ? '+' : ''}
                    ${row.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded font-mono text-[11px] font-bold',
                        row.type === 'Cr' && 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                        row.type === 'Dr' && 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
                        row.type === 'Nil' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {row.ledgerStatus === 'POSTED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Posted
                      </span>
                    )}
                    {row.ledgerStatus === 'UNPOSTED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        Unposted
                      </span>
                    )}
                    {row.ledgerStatus === 'DISCREPANCY' && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20"
                        title={`Ledger shows $${row.ledgerAmount ?? 0}, differs from calculated $${row.netAmount}`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Discrepancy
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-semibold border-t-2 border-border text-foreground">
              <td colSpan={3} className="py-2.5 px-3 font-sans">
                TOTALS ({rows.length} Brokers)
              </td>
              <td className="py-2.5 px-3 font-mono text-right">
                ${totals.totalBuyValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-3"></td>
              <td className="py-2.5 px-3 font-mono text-right">
                ${totals.totalSellValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td
                className={cn(
                  'py-2.5 px-3 font-mono text-right',
                  totals.netTradingAmount > 0 && 'text-emerald-600',
                  totals.netTradingAmount < 0 && 'text-rose-600'
                )}
              >
                ${totals.netTradingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-3 font-mono text-right">
                ${totals.totalCharges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td
                className={cn(
                  'py-2.5 px-3 font-mono text-right font-bold',
                  totals.netSettlementAmount > 0 && 'text-emerald-600',
                  totals.netSettlementAmount < 0 && 'text-rose-600'
                )}
              >
                ${totals.netSettlementAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-3 text-center">
                <span className="font-mono text-[11px] font-bold">
                  {totals.netSettlementAmount > 0 ? 'Cr' : totals.netSettlementAmount < 0 ? 'Dr' : 'Nil'}
                </span>
              </td>
              <td className="py-2.5 px-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
