'use client';

import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Check, X, Sliders, Layout, Layers, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ExportConfig {
  format: 'pdf' | 'excel';
  orientation: 'landscape' | 'portrait';
  scope: 'all' | 'page';
  includeKpis: boolean;
  includeSubtotals: boolean;
  includeTotals: boolean;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  totalRowsCount: number;
  currentPageRowsCount: number;
  onConfirmExport: (config: ExportConfig) => void;
  isExporting?: boolean;
}

export function ExportModal({
  isOpen,
  onClose,
  reportTitle,
  totalRowsCount,
  currentPageRowsCount,
  onConfirmExport,
  isExporting = false,
}: ExportModalProps) {
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [scope, setScope] = useState<'all' | 'page'>('all');
  const [includeKpis, setIncludeKpis] = useState(true);
  const [includeSubtotals, setIncludeSubtotals] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);

  if (!isOpen) return null;

  const handleDownload = () => {
    onConfirmExport({
      format,
      orientation,
      scope,
      includeKpis,
      includeSubtotals,
      includeTotals,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-[#0A1A4A] via-[#102E7A] to-[#1D4ED8] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Sliders className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Export Report Configuration</h3>
              <p className="text-[11px] text-blue-200">{reportTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* 1. Format Choice */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                  format === 'pdf'
                    ? 'border-[#2652C8] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    format === 'pdf' ? 'bg-[#2652C8] text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">PDF Document</div>
                  <div className="text-[11px] text-slate-500">Executive & branded styling</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                  format === 'excel'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    format === 'excel' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Excel Spreadsheet</div>
                  <div className="text-[11px] text-slate-500">Raw numbers & formulas</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. PDF Orientation (Only for PDF) */}
          {format === 'pdf' && (
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Page Orientation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                    orientation === 'landscape'
                      ? 'border-[#2652C8] bg-blue-50/50 text-[#2652C8] font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 rotate-90" />
                    <span>Landscape (Recommended)</span>
                  </div>
                  {orientation === 'landscape' && <Check className="w-4 h-4 text-[#2652C8]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                    orientation === 'portrait'
                      ? 'border-[#2652C8] bg-blue-50/50 text-[#2652C8] font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    <span>Portrait</span>
                  </div>
                  {orientation === 'portrait' && <Check className="w-4 h-4 text-[#2652C8]" />}
                </button>
              </div>
            </div>
          )}

          {/* 3. Scope / Range */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Export Scope
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  scope === 'all'
                    ? 'border-[#2652C8] bg-blue-50/50 text-[#2652C8] font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <span>All Filtered Data ({totalRowsCount} rows)</span>
                {scope === 'all' && <Check className="w-4 h-4 text-[#2652C8]" />}
              </button>

              <button
                type="button"
                onClick={() => setScope('page')}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  scope === 'page'
                    ? 'border-[#2652C8] bg-blue-50/50 text-[#2652C8] font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <span>Current Page Only ({currentPageRowsCount} rows)</span>
                {scope === 'page' && <Check className="w-4 h-4 text-[#2652C8]" />}
              </button>
            </div>
          </div>

          {/* 4. Sections & Elements */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Include In Document
            </label>
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeKpis}
                  onChange={(e) => setIncludeKpis(e.target.checked)}
                  className="rounded border-slate-300 text-[#2652C8] focus:ring-[#2652C8] w-4 h-4"
                />
                <span>Executive KPI Summary Cards</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSubtotals}
                  onChange={(e) => setIncludeSubtotals(e.target.checked)}
                  className="rounded border-slate-300 text-[#2652C8] focus:ring-[#2652C8] w-4 h-4"
                />
                <span>Subtotals per Group (Client / Broker / Script)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTotals}
                  onChange={(e) => setIncludeTotals(e.target.checked)}
                  className="rounded border-slate-300 text-[#2652C8] focus:ring-[#2652C8] w-4 h-4"
                />
                <span>Grand Total & System Audit Seal</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2652C8] hover:bg-[#1E40AF] text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Document...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Download {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
