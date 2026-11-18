'use client';

import React from 'react';
import { Scale, CheckCircle2, AlertCircle, DollarSign, Users, Briefcase } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SettlementSummaryCardsProps {
  reconciliation: {
    totalClientNet: number;
    totalBrokerNet: number;
    firmBrokerageSpread: number;
    firmTradingMargin: number;
    firmNetRealizedProfit: number;
    imbalanceDelta: number;
    isBalanced: boolean;
  };
  clientTotals: {
    totalBuyValue: number;
    totalSellValue: number;
    grossTradingPnL: number;
    totalBrokerage: number;
    netReceivable: number;
    netPayable: number;
    netSettlementAmount: number;
  };
  brokerTotals: {
    totalBuyValue: number;
    totalSellValue: number;
    netTradingAmount: number;
    totalCharges: number;
    netPayable: number;
    netReceivable: number;
    netSettlementAmount: number;
  };
}

export function SettlementSummaryCards({
  reconciliation,
  clientTotals,
  brokerTotals,
}: SettlementSummaryCardsProps) {
  const isFirmProfitPositive = reconciliation.firmNetRealizedProfit > 0;
  const isFirmProfitNegative = reconciliation.firmNetRealizedProfit < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ─── CARD 1: CLIENT NET CLEARING ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Client Net Clearing
          </span>
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              clientTotals.netSettlementAmount > 0 && 'text-emerald-600',
              clientTotals.netSettlementAmount < 0 && 'text-rose-600',
              clientTotals.netSettlementAmount === 0 && 'text-foreground'
            )}
          >
            {clientTotals.netSettlementAmount > 0 ? '+' : ''}$
            {clientTotals.netSettlementAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {clientTotals.netSettlementAmount > 0 ? 'Cr (Payable)' : clientTotals.netSettlementAmount < 0 ? 'Dr (Receivable)' : 'Balanced'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>Dr: ${clientTotals.netReceivable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span>Cr: ${clientTotals.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* ─── CARD 2: BROKER NET CLEARING ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Broker Net Clearing
          </span>
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              brokerTotals.netSettlementAmount > 0 && 'text-emerald-600',
              brokerTotals.netSettlementAmount < 0 && 'text-rose-600',
              brokerTotals.netSettlementAmount === 0 && 'text-foreground'
            )}
          >
            {brokerTotals.netSettlementAmount > 0 ? '+' : ''}$
            {brokerTotals.netSettlementAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {brokerTotals.netSettlementAmount > 0 ? 'Cr (Payable)' : brokerTotals.netSettlementAmount < 0 ? 'Dr (Receivable)' : 'Balanced'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>Dr: ${brokerTotals.netReceivable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span>Cr: ${brokerTotals.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* ─── CARD 3: FIRM NET PROFIT ───────────────────────────────────────── */}
      <div
        className={cn(
          'border rounded-xl p-4 shadow-xs transition-colors',
          isFirmProfitPositive && 'bg-emerald-500/5 border-emerald-500/30',
          isFirmProfitNegative && 'bg-rose-500/5 border-rose-500/30',
          !isFirmProfitPositive && !isFirmProfitNegative && 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Firm Realized Profit
          </span>
          <div
            className={cn(
              'p-2 rounded-lg',
              isFirmProfitPositive && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              isFirmProfitNegative && 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
              !isFirmProfitPositive && !isFirmProfitNegative && 'bg-muted text-muted-foreground'
            )}
          >
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              isFirmProfitPositive && 'text-emerald-600 dark:text-emerald-400',
              isFirmProfitNegative && 'text-rose-600 dark:text-rose-400',
              !isFirmProfitPositive && !isFirmProfitNegative && 'text-muted-foreground'
            )}
          >
            {isFirmProfitPositive ? '+' : ''}$
            {reconciliation.firmNetRealizedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>Brokerage: +${reconciliation.firmBrokerageSpread.toFixed(2)}</span>
          <span>Spread: ${reconciliation.firmTradingMargin.toFixed(2)}</span>
        </div>
      </div>

      {/* ─── CARD 4: DOUBLE-ENTRY EQUILIBRIUM BADGE ────────────────────────── */}
      <div
        className={cn(
          'border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-colors',
          reconciliation.isBalanced
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Double-Entry Equilibrium
          </span>
          <div
            className={cn(
              'p-2 rounded-lg',
              reconciliation.isBalanced
                ? 'bg-emerald-500/20 text-emerald-600'
                : 'bg-rose-500/20 text-rose-600'
            )}
          >
            <Scale className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2">
          {reconciliation.isBalanced ? (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Perfect Balance (0.00)</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  Δ = Client + Broker + Firm ≡ $0.00
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Imbalance Alert</p>
                <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5 font-mono">
                  Δ = ${reconciliation.imbalanceDelta.toFixed(2)} discrepancy
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-1.5">
          Standard accounting audit proof
        </p>
      </div>
    </div>
  );
}
