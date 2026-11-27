'use client';

import React from 'react';
import { Printer, Download, RefreshCw, Calendar, FileText, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  periodLabel?: string;
  asOfDate?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onPreviewReport?: () => void;
  onPrint?: () => void;
  onGenerateReport?: () => void;
}

export function ReportHeader({
  title,
  subtitle,
  periodLabel = 'As of Date',
  asOfDate,
  isLoading = false,
  onRefresh,
  onExportCsv,
  onExportPdf,
  onPreviewReport,
  onPrint,
  onGenerateReport,
}: ReportHeaderProps) {
  const formattedDate = asOfDate ? formatDateToDDMMYY(asOfDate) : formatDateToDDMMYY(new Date());
  const printTimestamp = `${formatDateToDDMMYY(new Date())} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const handlePreview = onPreviewReport || onGenerateReport;

  return (
    <>
      {/* ─── PRINT-ONLY HEADER ──────────────────────────────────────────────── */}
      <div className="hidden print:block print:mb-6 border-b pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-black">{title}</h1>
            <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>
          </div>
          <div className="text-right text-xs text-gray-700 space-y-0.5">
            <div>
              <span className="font-semibold">{periodLabel}:</span> {formattedDate}
            </div>
            <div>
              <span className="font-semibold">Printed:</span> {printTimestamp}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SCREEN HEADER ─────────────────────────────────────────────────── */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/90">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {asOfDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                <Calendar className="w-3.5 h-3.5 text-[#2652C8]" />
                {periodLabel}: {formattedDate}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {handlePreview && (
            <button
              type="button"
              onClick={handlePreview}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2652C8] text-white hover:bg-[#1E40AF] transition-all cursor-pointer disabled:opacity-50 shadow-xs active:scale-95 shrink-0"
              title="Open full document preview in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview Report</span>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Direct Download PDF Document"
            >
              <FileText className="w-3.5 h-3.5 text-[#2652C8]" />
              <span>Export PDF</span>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Export as Excel / CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Print Accounting Statement"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Report Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2652C8]' : 'text-slate-500'}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
