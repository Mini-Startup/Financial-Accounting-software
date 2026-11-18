'use client';

import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ReconciliationSectionProps {
  reconciliation: {
    totalClientNet: number;
    totalBrokerNet: number;
    firmBrokerageSpread: number;
    firmTradingMargin: number;
    firmNetRealizedProfit: number;
    imbalanceDelta: number;
    isBalanced: boolean;
  };
}

export function ReconciliationSection({ reconciliation }: ReconciliationSectionProps) {
  const isProfitPos = reconciliation.firmNetRealizedProfit > 0;
  const isProfitNeg = reconciliation.firmNetRealizedProfit < 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-muted/20 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Section 3: Double-Entry Reconciliation & Firm Margins</h2>
        </div>
        <div>
          {reconciliation.isBalanced ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Equilibrium Verified (Δ ≡ $0.00)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              Imbalance: ${reconciliation.imbalanceDelta.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* ─── LEFT: FIRM REALIZED PROFIT DECOMPOSITION ──────────────────────── */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
            Firm Gross Margin Breakdown
          </h3>
          <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Firm Brokerage Margin (Client - Broker):</span>
              <span className="font-mono font-medium text-foreground">
                +${reconciliation.firmBrokerageSpread.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Firm Trading / Execution Spread:</span>
              <span className="font-mono font-medium text-foreground">
                ${reconciliation.firmTradingMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between items-center font-bold text-sm">
              <span className="text-foreground">Total Firm Realized Profit:</span>
              <span
                className={cn(
                  'font-mono',
                  isProfitPos && 'text-emerald-600',
                  isProfitNeg && 'text-rose-600',
                  !isProfitPos && !isProfitNeg && 'text-foreground'
                )}
              >
                {isProfitPos ? '+' : ''}$
                {reconciliation.firmNetRealizedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: DOUBLE-ENTRY BALANCE PROOF ────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
            Double-Entry Accounting Proof
          </h3>
          <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total Client Net Position:</span>
              <span className="font-mono font-medium text-foreground">
                ${reconciliation.totalClientNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total Broker Net Position:</span>
              <span className="font-mono font-medium text-foreground">
                ${reconciliation.totalBrokerNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Firm Realized Profit:</span>
              <span className="font-mono font-medium text-foreground">
                ${reconciliation.firmNetRealizedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between items-center font-bold text-sm">
              <span className="text-foreground">Equilibrium Discrepancy (Δ):</span>
              <span
                className={cn(
                  'font-mono',
                  reconciliation.isBalanced ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                ${reconciliation.imbalanceDelta.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 bg-muted/10 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Accounting Formula: Client Net + Broker Net + Firm Net Profit ≡ $0.00</span>
        <span className="font-mono">Audit Standard: Zero Tolerance (&lt; 0.01)</span>
      </div>
    </div>
  );
}
