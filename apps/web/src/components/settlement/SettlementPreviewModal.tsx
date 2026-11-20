'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, AlertTriangle, Zap, Check, RefreshCw, 
  ArrowRight, ExternalLink, ShieldAlert, CheckCircle2,
  TrendingUp, ArrowDownRight, ArrowUpRight, Scale
} from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';
import type { SettlementPreviewData } from './types';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { cn } from '@/utils/cn';

interface SettlementPreviewModalProps {
  data: SettlementPreviewData;
  onClose: () => void;
  onConfirmExecute: () => void;
  isExecuting: boolean;
}

export function SettlementPreviewModal({
  data,
  onClose,
  onConfirmExecute,
  isExecuting,
}: SettlementPreviewModalProps) {
  useScrollLock(true);
  const [activeTab, setActiveTab] = useState<'SETTLEMENT' | 'CF' | 'BF'>('SETTLEMENT');

  if (typeof document === 'undefined') return null;

  const formatDateStr = (dateStr: string) => formatDateToDDMMYY(dateStr);

  const cfTrades = data.preview.filter((t) => t.tradeType === 'CARRY_FORWARD');
  const bfTrades = data.preview.filter((t) => t.tradeType === 'BACK_FORWARD');
  const settlementTrades = data.preview.filter((t) => t.tradeType === 'SETTLEMENT');

  const hasBlockingErrors = data.errors && data.errors.length > 0;

  const activeTrades = activeTab === 'SETTLEMENT' 
    ? settlementTrades 
    : activeTab === 'CF' 
      ? cfTrades 
      : bfTrades;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-slate-200 bg-white rounded-3xl animate-in zoom-in-95 duration-200">
        
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#2652C8] shadow-2xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Settlement Execution Preview
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  Cycle: {formatDateStr(data.settlementFromDate)} → {formatDateStr(data.settlementToDate)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Review verified settlement legs, carry-forward rollovers, and realized profit/loss bookings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Content Area ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          
          {/* Missing Closing Rates or Blocking Errors */}
          {hasBlockingErrors && (
            <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5 font-bold text-rose-800 text-xs">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Settlement Execution Blocked — Missing Closing Rates / Master Data</span>
                </div>
                <a
                  href="/closing-rates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  <span>Add Closing Rates</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {data.errors.map((err, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-rose-100 text-xs text-rose-900 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <div>
                      <strong className="font-semibold text-rose-950">{err.securityName}:</strong>{' '}
                      <span className="text-rose-700">{err.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── KPI Summary Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div 
              onClick={() => setActiveTab('SETTLEMENT')}
              className={cn(
                'p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between',
                activeTab === 'SETTLEMENT'
                  ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
              )}
            >
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  1. Net Settlement
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {settlementTrades.length} Trades
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Books realized P&amp;L into accounts
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#2652C8] flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('CF')}
              className={cn(
                'p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between',
                activeTab === 'CF'
                  ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
              )}
            >
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  2. Carry Forward (CF)
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {cfTrades.length} Trades
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Closes cutoff open positions
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('BF')}
              className={cn(
                'p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between',
                activeTab === 'BF'
                  ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
              )}
            >
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  3. Back Forward (BF)
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {bfTrades.length} Trades
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Re-opens positions next day
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* ── Segmented Control & Action Header ──────────────────────────── */}
          <div className="flex items-center justify-between pt-1">
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('SETTLEMENT')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'SETTLEMENT'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>Net Settlement Trades</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-[#2652C8] font-bold">
                  {settlementTrades.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CF')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'CF'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>Carry Forward (CF)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800 font-bold">
                  {cfTrades.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('BF')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'BF'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>Back Forward (BF)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                  {bfTrades.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900 font-mono">{activeTrades.length}</strong> records
            </div>
          </div>

          {/* ── High-Contrast Data Table ────────────────────────────────────── */}
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/95 backdrop-blur-xs text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-4">Party</th>
                    <th className="py-2.5 px-3">Script</th>
                    <th className="py-2.5 px-3 text-center">Side</th>
                    <th className="py-2.5 px-4 text-right">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Rate</th>
                    <th className="py-2.5 px-4 text-right">Est. Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {activeTrades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-normal italic bg-slate-50/30">
                        No {activeTab.toLowerCase()} trades generated for this settlement scope
                      </td>
                    </tr>
                  ) : (
                    activeTrades.map((t, idx) => {
                      const estValue = (t.quantity || 0) * (t.rate || 0);
                      const isBuy = t.transactionType === 'BUY';

                      return (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {t.accountCode}
                              </span>
                              <span className="font-semibold text-slate-900">{t.accountName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900">{t.scriptShortName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border',
                                isBuy
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              )}
                            >
                              {t.transactionType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                            {t.quantity?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                            {t.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {estValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {hasBlockingErrors ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100/80 text-rose-800 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Execution Blocked by Missing Rates
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Ready to Execute • {data.unsettledTradesCount} Trades to Settle
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirmExecute}
              disabled={hasBlockingErrors || isExecuting}
              className="px-5 py-2.5 bg-[#2652C8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Settlement…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Execute Settlement</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
