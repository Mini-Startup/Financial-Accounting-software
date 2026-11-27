'use client';

import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Check, X, Sliders, Layout, Download } from 'lucide-react';
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
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [scope, setScope] = useState<'all' | 'page'>('all');
  const [includeSubtotals, setIncludeSubtotals] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);

  if (!isOpen) return null;

  const handleDownload = () => {
    onConfirmExport({
      format,
      orientation,
      scope,
      includeKpis: false, // Permanently purged
      includeSubtotals,
      includeTotals,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg flex flex-col p-0 overflow-hidden shadow-2xl border border-slate-200/90 bg-white rounded-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Executive Modal Header (Matching Standard App Modals) */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
              <Sliders className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                Export Document Configuration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs sm:max-w-sm">
                {reportTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 bg-white text-slate-800">
          {/* 1. Page Orientation (First priority as requested) */}
          {format === 'pdf' && (
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Page Orientation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                    orientation === 'portrait'
                      ? 'border-[#2652C8] bg-blue-50/60 text-[#2652C8] font-bold ring-1 ring-blue-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    <span>Portrait (Recommended)</span>
                  </div>
                  {orientation === 'portrait' && <Check className="w-4 h-4 text-[#2652C8]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                    orientation === 'landscape'
                      ? 'border-[#2652C8] bg-blue-50/60 text-[#2652C8] font-bold ring-1 ring-blue-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 rotate-90" />
                    <span>Landscape</span>
                  </div>
                  {orientation === 'landscape' && <Check className="w-4 h-4 text-[#2652C8]" />}
                </button>
              </div>
            </div>
          )}

          {/* 2. Format Choice */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                  format === 'pdf'
                    ? 'border-[#2652C8] bg-blue-50/60 ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    format === 'pdf' ? 'bg-[#2652C8] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
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
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                  format === 'excel'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    format === 'excel' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Excel Sheet</div>
                  <div className="text-[11px] text-slate-500">Raw formulas & numbers</div>
                </div>
              </button>
            </div>
          </div>

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
                    ? 'border-[#2652C8] bg-blue-50/60 text-[#2652C8] font-bold ring-1 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <span>All Records ({totalRowsCount})</span>
                {scope === 'all' && <Check className="w-4 h-4 text-[#2652C8]" />}
              </button>

              <button
                type="button"
                onClick={() => setScope('page')}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  scope === 'page'
                    ? 'border-[#2652C8] bg-blue-50/60 text-[#2652C8] font-bold ring-1 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <span>Current Page ({currentPageRowsCount})</span>
                {scope === 'page' && <Check className="w-4 h-4 text-[#2652C8]" />}
              </button>
            </div>
          </div>

          {/* 4. Sections & Elements */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Include In Document
            </label>
            <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
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
                <span>Grand Total &amp; System Audit Seal</span>
              </label>
            </div>
          </div>
        </div>

        {/* Executive Modal Footer (Matching Standard App Modals) */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0A1A4A] hover:bg-[#102E7A] text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Document...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
