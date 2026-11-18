'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Layers, DollarSign, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NetPositionCardsProps {
  summary: {
    totalOpenTrades: number;
    totalOpenContracts: number;
    totalLongContracts: number;
    totalShortContracts: number;
    totalNotionalMarketValue: number;
    totalUnrealizedPnL: number;
    missingClosingRatesCount: number;
  };
}

export function NetPositionCards({ summary }: NetPositionCardsProps) {
  const isPnlPositive = summary.totalUnrealizedPnL > 0;
  const isPnlNegative = summary.totalUnrealizedPnL < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ─── CARD 1: OPEN CONTRACTS ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Open Contracts
          </span>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {summary.totalOpenContracts.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-muted-foreground">Lots</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-medium flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            +{summary.totalLongContracts.toLocaleString()} Long
          </span>
          <span className="text-rose-600 font-medium flex items-center gap-0.5">
            <TrendingDown className="w-3 h-3" />
            -{summary.totalShortContracts.toLocaleString()} Short
          </span>
        </div>
      </div>

      {/* ─── CARD 2: TOTAL TRADES ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Open Executions
          </span>
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {summary.totalOpenTrades.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">unsettled trades</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Pending settlement cycle integration
        </p>
      </div>

      {/* ─── CARD 3: NOTIONAL MARKET VALUE ─────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notional Market Value
          </span>
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
            ${summary.totalNotionalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Gross mark-to-market position size
        </p>
      </div>

      {/* ─── CARD 4: UNREALIZED MTM PNL ────────────────────────────────────── */}
      <div
        className={cn(
          'border rounded-xl p-4 shadow-xs transition-colors',
          isPnlPositive && 'bg-emerald-500/5 border-emerald-500/30',
          isPnlNegative && 'bg-rose-500/5 border-rose-500/30',
          !isPnlPositive && !isPnlNegative && 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Unrealized MTM PnL
          </span>
          <div
            className={cn(
              'p-2 rounded-lg',
              isPnlPositive && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              isPnlNegative && 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
              !isPnlPositive && !isPnlNegative && 'bg-muted text-muted-foreground'
            )}
          >
            {isPnlPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : isPnlNegative ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <DollarSign className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              isPnlPositive && 'text-emerald-600 dark:text-emerald-400',
              isPnlNegative && 'text-rose-600 dark:text-rose-400',
              !isPnlPositive && !isPnlNegative && 'text-muted-foreground'
            )}
          >
            {isPnlPositive ? '+' : ''}
            ${summary.totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {summary.missingClosingRatesCount > 0 ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{summary.missingClosingRatesCount} security closing rates missing</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Fully benchmarked against latest closing rates
          </p>
        )}
      </div>
    </div>
  );
}
