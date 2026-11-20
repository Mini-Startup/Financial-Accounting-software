'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Layers, IndianRupee, AlertTriangle, Scale, ShieldCheck } from 'lucide-react';
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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Open Contracts
          </span>
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-[#2652C8] shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {summary.totalOpenContracts.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-semibold text-slate-400">Lots</span>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs pt-2 border-t border-slate-100">
          <span className="text-emerald-700 font-bold flex items-center gap-1 font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            +{summary.totalLongContracts.toLocaleString('en-IN')} Long
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-rose-700 font-bold flex items-center gap-1 font-mono">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            -{summary.totalShortContracts.toLocaleString('en-IN')} Short
          </span>
        </div>
      </div>

      {/* ─── CARD 2: TOTAL TRADES ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Open Executions
          </span>
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 shadow-2xs">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {summary.totalOpenTrades.toLocaleString('en-IN')}
          </span>
          <span className="text-xs font-semibold text-slate-400">unsettled trades</span>
        </div>
        <div className="mt-3 text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
          Pending settlement cycle integration
        </div>
      </div>

      {/* ─── CARD 3: NOTIONAL MARKET VALUE ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Notional Market Value
          </span>
          <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 shadow-2xs">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            ₹{summary.totalNotionalMarketValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-3 text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
          Gross mark-to-market position size
        </div>
      </div>

      {/* ─── CARD 4: UNREALIZED MTM PNL ────────────────────────────────────── */}
      <div
        className={cn(
          'border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors bg-white',
          isPnlPositive && 'border-emerald-200 ring-1 ring-emerald-500/10',
          isPnlNegative && 'border-rose-200 ring-1 ring-rose-500/10',
          !isPnlPositive && !isPnlNegative && 'border-slate-200/90'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Unrealized MTM PnL
          </span>
          <div
            className={cn(
              'p-2 rounded-xl shadow-2xs',
              isPnlPositive && 'bg-emerald-50 border border-emerald-200 text-emerald-700',
              isPnlNegative && 'bg-rose-50 border border-rose-200 text-rose-700',
              !isPnlPositive && !isPnlNegative && 'bg-slate-50 border border-slate-200 text-slate-600'
            )}
          >
            {isPnlPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : isPnlNegative ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <IndianRupee className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight',
              isPnlPositive && 'text-emerald-700',
              isPnlNegative && 'text-rose-700',
              !isPnlPositive && !isPnlNegative && 'text-slate-800'
            )}
          >
            {isPnlPositive ? '+' : ''}
            ₹{summary.totalUnrealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100">
          {summary.missingClosingRatesCount > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{summary.missingClosingRatesCount} closing rates missing</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Benchmarked with closing rates</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
