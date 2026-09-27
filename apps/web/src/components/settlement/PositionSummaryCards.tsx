'use client';

import { TrendingUp, TrendingDown, Layers, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PositionSummaryCardsProps {
  pnlDisplayStr: string;
  netTotalPnL: number;
  totalVolume: number;
  openPositionsCount: number;
  totalLegsCount: number;
}

export function PositionSummaryCards({
  pnlDisplayStr,
  netTotalPnL,
  totalVolume,
  openPositionsCount,
  totalLegsCount,
}: PositionSummaryCardsProps) {
  const isPositive = netTotalPnL >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Net Settlement P&L */}
      <div className="card bg-white p-4.5 border-l-4 border-l-emerald-600 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Net P&amp;L
          </span>
          <div
            className={cn(
              'p-1.5 rounded-md',
              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            )}
          >
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2">
          <span
            className={cn(
              'text-xl font-bold font-mono',
              isPositive ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'
            )}
          >
            {pnlDisplayStr}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Realized closed profit + live mark-to-market on open contracts
        </p>
      </div>

      {/* 2. Total Traded Volume */}
      <div className="card bg-white p-4.5 border-l-4 border-l-blue-600 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Traded Volume
          </span>
          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {totalVolume.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 ml-1.5 font-medium">lots</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Gross buy and sell lots in current view</p>
      </div>

      {/* 3. Open Positions Exposure */}
      <div className="card bg-white p-4.5 border-l-4 border-l-amber-500 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Open Positions
          </span>
          <div className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {openPositionsCount}
          </span>
          <span className="text-xs text-slate-500 ml-1.5 font-medium">active contracts</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Positions to carry forward at closing rate</p>
      </div>

      {/* 4. Total Positions Evaluated */}
      <div className="card bg-white p-4.5 border-l-4 border-l-slate-400 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Evaluated Legs
          </span>
          <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {totalLegsCount}
          </span>
          <span className="text-xs text-slate-500 ml-1.5 font-medium">party-script legs</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">All client &amp; broker position legs calculated</p>
      </div>
    </div>
  );
}
