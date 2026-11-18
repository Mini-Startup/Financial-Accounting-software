'use client';

import React from 'react';
import { Printer, Download, RefreshCw, Calendar } from 'lucide-react';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  periodLabel?: string;
  asOfDate?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
}

export function ReportHeader({
  title,
  subtitle,
  periodLabel = 'As of Date',
  asOfDate,
  isLoading = false,
  onRefresh,
  onExportCsv,
  onPrint,
}: ReportHeaderProps) {
  const formattedDate = asOfDate ? formatDateToDDMMYY(asOfDate) : formatDateToDDMMYY(new Date());
  const printTimestamp = `${formatDateToDDMMYY(new Date())} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {asOfDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Calendar className="w-3.5 h-3.5" />
                {periodLabel}: {formattedDate}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Report Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors cursor-pointer disabled:opacity-50"
              title="Export as CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Export CSV
            </button>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              title="Print Accounting Statement"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          )}
        </div>
      </div>
    </>
  );
}
