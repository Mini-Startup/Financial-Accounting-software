'use client';

import { Calculator, Zap, Trash2, Layers, RefreshCw } from 'lucide-react';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import type { SettlementRecord } from './types';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

interface SettlementActionBarProps {
  selectedSettlementId: string;
  reportDate: string;
  setReportDate: (d: string) => void;
  onGenerate: (e?: React.FormEvent) => void;
  onOpenPreview: () => void;
  loading: boolean;
  hasGenerated: boolean;
  isExecutingSettlement: boolean;
  settlementsList: SettlementRecord[];
  isNewestSettlement: (id: string) => boolean;
  onDeleteSettlement: (s: SettlementRecord) => void;
  activeTab: 'SUMMARY' | 'TRADES';
  setActiveTab: (tab: 'SUMMARY' | 'TRADES') => void;
  settledTradesCount: number;
}

export function SettlementActionBar({
  selectedSettlementId,
  reportDate,
  setReportDate,
  onGenerate,
  onOpenPreview,
  loading,
  hasGenerated,
  isExecutingSettlement,
  settlementsList,
  isNewestSettlement,
  onDeleteSettlement,
  activeTab,
  setActiveTab,
  settledTradesCount,
}: SettlementActionBarProps) {
  const currentSettlement = settlementsList.find((s) => s.id === selectedSettlementId);

  const formatDateStr = (dateStr: string) => formatDateToDDMMYY(dateStr);

  return (
    <div className="space-y-4">
      {selectedSettlementId === 'LIVE' ? (
        /* Live Settlements Action Form Card */
        <div className="card bg-white p-5 rounded-2xl shadow-xs border border-[var(--color-border-light)]">
          <form onSubmit={onGenerate} className="flex flex-col md:flex-row items-end gap-5">
            <div className="form-field flex-1 max-w-xs">
              <label className="form-label form-label--required text-xs font-semibold text-slate-700">
                Closing Rate Date (Cutoff)
              </label>
              <UniversalDatePicker
                value={reportDate}
                onChange={(d) => setReportDate(d)}
                placeholder="DD-MM-YY"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn--secondary h-[38px] px-4 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Calculating…</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenPreview}
                disabled={isExecutingSettlement || !hasGenerated}
                className="btn btn--primary h-[38px] px-4 flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Preview and execute automated CF, BF, and Settlement cycle"
              >
                {isExecutingSettlement ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Generate CF / BF / Settlement</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Historical Settlement Banner */
        <div className="card p-4.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              FINALIZED
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950 font-display">
                {currentSettlement?.name || 'Historical Settlement'}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Period: {formatDateStr(currentSettlement?.fromDate || '')} to {formatDateStr(currentSettlement?.toDate || '')}
                {' • '}
                <strong>{settledTradesCount}</strong> trades settled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
              Read-only Finalized Record
            </span>

            {isNewestSettlement(selectedSettlementId) && currentSettlement && (
              <button
                type="button"
                onClick={() => onDeleteSettlement(currentSettlement)}
                className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Roll back and delete this settlement (only the latest settlement can be reversed)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Settlement</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs Switcher for Historical Settlement */}
      {selectedSettlementId !== 'LIVE' && (
        <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('SUMMARY')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SUMMARY'
                ? 'bg-[var(--color-charcoal)] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Position Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRADES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'TRADES'
                ? 'bg-[var(--color-charcoal)] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Settled Trades ({settledTradesCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
