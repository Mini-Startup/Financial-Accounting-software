'use client';

import { Calculator, Zap, Trash2, Layers, RefreshCw } from 'lucide-react';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import type { SettlementRecord } from './types';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { cn } from '@/utils/cn';

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
  canExecuteSettlement?: boolean;
  canDeleteSettlement?: boolean;
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
  canExecuteSettlement = true,
  canDeleteSettlement = true,
}: SettlementActionBarProps) {
  const currentSettlement = settlementsList.find((s) => s.id === selectedSettlementId);

  const formatDateStr = (dateStr: string) => formatDateToDDMMYY(dateStr);

  return (
    <div className="space-y-4">
      {selectedSettlementId === 'LIVE' ? (
        /* Live Settlements Action Form Card */
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90">
          <form onSubmit={onGenerate} className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="flex-1 max-w-sm">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Closing Rate Cutoff Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <UniversalDatePicker
                value={reportDate}
                onChange={(d) => setReportDate(d)}
                placeholder="DD-MM-YY"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Settles contracts and evaluates MTM rates on or prior to this cutoff date.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                    <span>Calculating…</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 text-slate-600" />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>

              {canExecuteSettlement && (
                <button
                  type="button"
                  onClick={onOpenPreview}
                  disabled={isExecutingSettlement || !hasGenerated}
                  className="px-5 py-2.5 bg-[#2652C8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  title="Preview and execute automated CF, BF, and Settlement cycle"
                >
                  {isExecutingSettlement ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Generate CF / BF / Settlement</span>
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* Historical Settlement Banner */
        <div className="p-4.5 bg-emerald-50/70 border border-emerald-200 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider border border-emerald-300/70 shadow-2xs">
              FINALIZED
            </span>
            <div>
              <h3 className="text-sm font-bold text-emerald-950 font-display">
                {currentSettlement?.name || 'Historical Settlement'}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Period: <strong className="font-mono">{formatDateStr(currentSettlement?.fromDate || '')}</strong> to <strong className="font-mono">{formatDateStr(currentSettlement?.toDate || '')}</strong>
                {' • '}
                <strong className="font-mono">{settledTradesCount}</strong> trades settled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
              Read-only Finalized Record
            </span>

            {isNewestSettlement(selectedSettlementId) && currentSettlement && canDeleteSettlement && (
              <button
                type="button"
                onClick={() => onDeleteSettlement(currentSettlement)}
                className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
        <div className="inline-flex rounded-2xl border border-slate-200 p-1 bg-slate-100/70 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('SUMMARY')}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeTab === 'SUMMARY'
                ? 'bg-white text-[#2652C8] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Position Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRADES')}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeTab === 'TRADES'
                ? 'bg-white text-[#2652C8] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Settled Trades ({settledTradesCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
