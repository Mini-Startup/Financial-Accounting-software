'use client';

import { createPortal } from 'react-dom';
import { X, AlertTriangle, Zap, Check, RefreshCw } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';
import type { SettlementPreviewData } from './types';

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

  if (typeof document === 'undefined') return null;

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const cfTrades = data.preview.filter((t) => t.tradeType === 'CARRY_FORWARD');
  const bfTrades = data.preview.filter((t) => t.tradeType === 'BACK_FORWARD');
  const settlementTrades = data.preview.filter((t) => t.tradeType === 'SETTLEMENT');

  const hasBlockingErrors = data.errors && data.errors.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="card w-full max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-slate-200 bg-white rounded-2xl">
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)] p-5 border-b border-[var(--color-border-light)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Zap className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Settlement Execution Preview
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cycle: <strong>{formatDateStr(data.settlementFromDate)}</strong> to{' '}
                <strong>{formatDateStr(data.settlementToDate)}</strong> • {data.unsettledTradesCount} unsettled trades
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Missing closing rates or validation errors */}
          {hasBlockingErrors && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Cannot Execute Settlement — Missing Closing Rates / Master Data</span>
              </div>
              <ul className="list-disc pl-5 text-rose-700 space-y-1">
                {data.errors.map((err, idx) => (
                  <li key={idx}>
                    <strong>{err.securityName}</strong>: {err.message}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-rose-600 pt-1">
                Please add the required closing rates in the Closing Rates module before executing this settlement.
              </p>
            </div>
          )}

          {/* Settlement Trades Summary (P&L booking) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Net Settlement Trades ({settlementTrades.length})
              </h4>
              <span className="text-[11px] text-slate-500">Books realized P&amp;L into accounts</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px]">
                    <th className="py-2 px-3">Party</th>
                    <th className="py-2 px-3">Script</th>
                    <th className="py-2 px-3 text-center">Side</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Settlement Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlementTrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-slate-400 italic">
                        No closed settlement trades generated
                      </td>
                    </tr>
                  ) : (
                    settlementTrades.map((t, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-medium">{t.accountCode} - {t.accountName}</td>
                        <td className="py-2 px-3">{t.scriptShortName}</td>
                        <td className="py-2 px-3 text-center font-bold text-xs">{t.transactionType}</td>
                        <td className="py-2 px-3 text-right font-mono">{t.quantity?.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono">{t.rate?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Carry Forward Trades */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Carry Forward (CF) Trades ({cfTrades.length})
              </h4>
              <span className="text-[11px] text-slate-500">Closes open positions on cutoff date at closing rate</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px]">
                    <th className="py-2 px-3">Party</th>
                    <th className="py-2 px-3">Script</th>
                    <th className="py-2 px-3 text-center">Side</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Closing Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cfTrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-slate-400 italic">
                        No open positions to carry forward
                      </td>
                    </tr>
                  ) : (
                    cfTrades.map((t, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-medium">{t.accountCode} - {t.accountName}</td>
                        <td className="py-2 px-3">{t.scriptShortName}</td>
                        <td className="py-2 px-3 text-center font-bold text-xs">{t.transactionType}</td>
                        <td className="py-2 px-3 text-right font-mono">{t.quantity?.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono">{t.rate?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Back Forward Trades */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Back Forward (BF) Trades ({bfTrades.length})
              </h4>
              <span className="text-[11px] text-slate-500">Re-opens positions next day at same closing rate</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px]">
                    <th className="py-2 px-3">Party</th>
                    <th className="py-2 px-3">Script</th>
                    <th className="py-2 px-3 text-center">Side</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Opening Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bfTrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-slate-400 italic">
                        No open positions to re-open next day
                      </td>
                    </tr>
                  ) : (
                    bfTrades.map((t, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-medium">{t.accountCode} - {t.accountName}</td>
                        <td className="py-2 px-3">{t.scriptShortName}</td>
                        <td className="py-2 px-3 text-center font-bold text-xs">{t.transactionType}</td>
                        <td className="py-2 px-3 text-right font-mono">{t.quantity?.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono">{t.rate?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--color-snow)] border-t border-[var(--color-border-light)] flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn btn--secondary text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirmExecute}
            disabled={hasBlockingErrors || isExecuting}
            className="btn btn--primary text-xs flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>,
    document.body
  );
}
