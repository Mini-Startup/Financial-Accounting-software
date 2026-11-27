'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { ReportControlsBar } from '@/components/reports/ReportControlsBar';
import { SettlementSummaryCards } from '@/components/reports/SettlementSummaryCards';
import { SettlementBalanceSheetTable } from '@/components/reports/SettlementBalanceSheetTable';
import { ClientSummarySection } from '@/components/reports/ClientSummarySection';
import { BrokerSummarySection } from '@/components/reports/BrokerSummarySection';
import { ReconciliationSection } from '@/components/reports/ReconciliationSection';
import {
  generateCsvString,
  downloadCsvFile,
  formatExportFilename,
  triggerPrint,
} from '@/components/reports/ReportExportUtils';
import { downloadReportPdf, type PdfExportGroup, type PdfExportKpi } from '@/lib/pdf/reportPdfGenerator';
import { SettlementSummaryReportResponse } from '@/components/reports/types';
import { DropdownOption } from '@/components/ui/UniversalDropdown';

export default function SettlementSummaryPage() {
  const [settlementId, setSettlementId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [balanceSheetMode, setBalanceSheetMode] = useState<'CLIENT' | 'BROKER'>('CLIENT');

  const [summaryData, setSummaryData] = useState<SettlementSummaryReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settlementOptions, setSettlementOptions] = useState<DropdownOption[]>([]);

  // Load settlements list
  useEffect(() => {
    async function loadSettlements() {
      try {
        const res = await apiFetch('/settlement/settlements');
        if (res.ok) {
          const settlements = await res.json();
          if (Array.isArray(settlements)) {
            const opts: DropdownOption[] = [
              { value: 'LIVE', label: 'Live Unsettled Trades' },
              ...settlements.map((s: any) => ({
                value: s.id,
                label: `${s.name} (${formatDateToDDMMYY(s.fromDate)} to ${formatDateToDDMMYY(s.toDate)})`,
              })),
            ];
            setSettlementOptions(opts);
            if (settlements.length > 0 && !settlementId) {
              setSettlementId(settlements[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load settlements:', err);
      }
    }
    loadSettlements();
  }, [settlementId]);

  // Fetch report data
  const fetchSummaryReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (settlementId) params.set('settlementId', settlementId);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const res = await apiFetch(`/reports/settlement-summary?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data: SettlementSummaryReportResponse = await res.json();
      setSummaryData(data);
    } catch (err) {
      toast.error('Failed to load Financial Settlement Sheet', {
        description: (err as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [settlementId, fromDate, toDate]);

  useEffect(() => {
    fetchSummaryReport();
  }, [fetchSummaryReport]);

  // CSV Export
  const handleExportCsv = () => {
    if (!summaryData) {
      toast.error('No settlement summary data to export');
      return;
    }

    const headers = [
      'Section',
      'Account Code',
      'Account Name',
      'Buy Qty',
      'Buy Value',
      'Sell Qty',
      'Sell Value',
      'Net Trades / Gross PnL',
      'Charges / Brokerage',
      'Net Settlement Amount',
      'Type (Dr/Cr)',
      'Ledger Status',
    ];

    const rows: (string | number)[][] = [];

    // Client rows
    for (const r of summaryData.clientSummary.rows) {
      rows.push([
        'CLIENT',
        r.accountCode,
        r.accountName,
        r.buyQty,
        r.buyValue.toFixed(2),
        r.sellQty,
        r.sellValue.toFixed(2),
        r.grossPnL.toFixed(2),
        r.brokerage.toFixed(2),
        r.netAmount.toFixed(2),
        r.type,
        r.ledgerStatus,
      ]);
    }

    // Broker rows
    for (const r of summaryData.brokerSummary.rows) {
      rows.push([
        'BROKER',
        r.brokerCode,
        r.brokerName,
        r.buyQty,
        r.buyValue.toFixed(2),
        r.sellQty,
        r.sellValue.toFixed(2),
        r.netTradingAmount.toFixed(2),
        r.charges.toFixed(2),
        r.netAmount.toFixed(2),
        r.type,
        r.ledgerStatus,
      ]);
    }

    // Reconciliation summary rows
    rows.push([]);
    rows.push(['RECONCILIATION', 'Total Client Net', '', '', '', '', '', '', '', summaryData.reconciliation.totalClientNet.toFixed(2), '', '']);
    rows.push(['RECONCILIATION', 'Total Broker Net', '', '', '', '', '', '', '', summaryData.reconciliation.totalBrokerNet.toFixed(2), '', '']);
    rows.push(['RECONCILIATION', 'Firm Brokerage Spread', '', '', '', '', '', '', '', summaryData.reconciliation.firmBrokerageSpread.toFixed(2), '', '']);
    rows.push(['RECONCILIATION', 'Firm Trading Margin', '', '', '', '', '', '', '', summaryData.reconciliation.firmTradingMargin.toFixed(2), '', '']);
    rows.push(['RECONCILIATION', 'Firm Realized Profit', '', '', '', '', '', '', '', summaryData.reconciliation.firmNetRealizedProfit.toFixed(2), '', '']);
    rows.push(['RECONCILIATION', 'Imbalance Delta', '', '', '', '', '', '', '', summaryData.reconciliation.imbalanceDelta.toFixed(2), '', summaryData.reconciliation.isBalanced ? 'BALANCED' : 'IMBALANCE']);

    const csv = generateCsvString(headers, rows);
    const cycleName = summaryData.settlement.name || 'Cycle';
    const filename = formatExportFilename('Financial_Settlement_Sheet', cycleName);
    downloadCsvFile(filename, csv);
    toast.success('Financial Settlement Sheet exported to CSV');
  };

  const handlePreviewReport = () => {
    const params = new URLSearchParams();
    params.set('type', 'settlement-summary');
    if (settlementId) params.set('settlementId', settlementId);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    window.open(`/report-viewer?${params.toString()}`, '_blank');
  };

  const handleExportPdf = () => {
    if (!summaryData) {
      toast.error('No settlement summary data to export');
      return;
    }

    const headers = ['Account Code', 'Account Name', 'Buy Value', 'Sell Value', 'Trading PnL', 'Brokerage / Charges', 'Net Settlement', 'Status'];
    const clientRows = summaryData.clientSummary?.rows?.map((r) => [
      r.accountCode,
      r.accountName,
      r.buyValue.toFixed(2),
      r.sellValue.toFixed(2),
      r.grossPnL.toFixed(2),
      r.brokerage.toFixed(2),
      r.netAmount.toFixed(2),
      r.ledgerStatus,
    ]) || [];

    const brokerRows = summaryData.brokerSummary?.rows?.map((r) => [
      r.brokerCode,
      r.brokerName,
      r.buyValue.toFixed(2),
      r.sellValue.toFixed(2),
      r.netTradingAmount.toFixed(2),
      r.charges.toFixed(2),
      r.netAmount.toFixed(2),
      r.ledgerStatus,
    ]) || [];

    const groups: PdfExportGroup[] = [
      {
        groupTitle: `Clients Settlement Summary (${clientRows.length} Accounts)`,
        rows: clientRows,
        subtotalRow: [
          'Total Clients',
          '-',
          (summaryData.clientSummary?.totals?.totalBuyValue || 0).toFixed(2),
          (summaryData.clientSummary?.totals?.totalSellValue || 0).toFixed(2),
          (summaryData.clientSummary?.totals?.grossTradingPnL || 0).toFixed(2),
          (summaryData.clientSummary?.totals?.totalBrokerage || 0).toFixed(2),
          (summaryData.clientSummary?.totals?.netSettlementAmount || 0).toFixed(2),
          '-',
        ],
      },
      {
        groupTitle: `Brokers Settlement Summary (${brokerRows.length} Accounts)`,
        rows: brokerRows,
        subtotalRow: [
          'Total Brokers',
          '-',
          (summaryData.brokerSummary?.totals?.totalBuyValue || 0).toFixed(2),
          (summaryData.brokerSummary?.totals?.totalSellValue || 0).toFixed(2),
          (summaryData.brokerSummary?.totals?.netTradingAmount || 0).toFixed(2),
          (summaryData.brokerSummary?.totals?.totalCharges || 0).toFixed(2),
          (summaryData.brokerSummary?.totals?.netSettlementAmount || 0).toFixed(2),
          '-',
        ],
      },
    ];

    const kpis: PdfExportKpi[] = [
      { label: 'Client Net', value: (summaryData.reconciliation?.totalClientNet || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
      { label: 'Broker Net', value: (summaryData.reconciliation?.totalBrokerNet || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
      { label: 'Firm Net Profit', value: (summaryData.reconciliation?.firmNetRealizedProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), color: 'green' },
      {
        label: 'Equilibrium',
        value: summaryData.reconciliation?.isBalanced ? 'BALANCED' : 'IMBALANCE',
        color: summaryData.reconciliation?.isBalanced ? 'green' : 'red',
      },
    ];

    downloadReportPdf({
      reportTitle: 'Financial Settlement Summary Sheet',
      reportSubtitle: `Consolidated balance sheet for ${summaryData.settlement?.name || 'Cycle'}`,
      periodLabel: 'Settlement Period',
      asOfDate: summaryData.settlement ? `${formatDateToDDMMYY(summaryData.settlement.fromDate)} - ${formatDateToDDMMYY(summaryData.settlement.toDate)}` : undefined,
      headers,
      groups,
      kpis,
      columnAlignments: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'center'],
    });
    toast.success('Settlement Summary downloaded as PDF');
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <ReportHeader
        title="Settlement Summary (Reconciliation)"
        subtitle="Executive double-entry clearing statement with client net, broker net, and equilibrium verification"
        periodLabel="Cycle Period"
        asOfDate={
          summaryData?.settlement
            ? `${summaryData.settlement.fromDate} to ${summaryData.settlement.toDate}`
            : undefined
        }
        isLoading={isLoading}
        onRefresh={fetchSummaryReport}
        onPreviewReport={handlePreviewReport}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        onPrint={triggerPrint}
      />

      {/* ─── CONTROLS BAR ──────────────────────────────────────────────────── */}
      <ReportControlsBar
        settlementId={settlementId}
        onSettlementChange={setSettlementId}
        settlementOptions={settlementOptions}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        onResetFilters={handleResetFilters}
      />

      {/* ─── DOUBLE-ENTRY SETTLEMENT TRIAL BALANCE (EXACT AS SCREENSHOT) ── */}
      {summaryData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reconciliation Sheet View:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shadow-2xs">
              <button
                type="button"
                onClick={() => setBalanceSheetMode('CLIENT')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  balanceSheetMode === 'CLIENT'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Client Trial Balance
              </button>
              <button
                type="button"
                onClick={() => setBalanceSheetMode('BROKER')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  balanceSheetMode === 'BROKER'
                    ? 'bg-white text-[#2652C8] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Broker Trial Balance
              </button>
            </div>
          </div>

          <SettlementBalanceSheetTable
            settlementName={summaryData.settlement.name}
            fromDate={summaryData.settlement.fromDate}
            toDate={summaryData.settlement.toDate}
            clientRows={summaryData.clientSummary.rows}
            brokerRows={summaryData.brokerSummary.rows}
            viewMode={balanceSheetMode}
          />
        </div>
      )}

      {/* ─── EXECUTIVE METRIC CARDS ────────────────────────────────────────── */}
      {summaryData && (
        <SettlementSummaryCards
          reconciliation={summaryData.reconciliation}
          clientTotals={summaryData.clientSummary.totals}
          brokerTotals={summaryData.brokerSummary.totals}
        />
      )}

      {/* ─── SECTION 1: CLIENT SETTLEMENT CLEARING ─────────────────────────── */}
      {summaryData && (
        <ClientSummarySection
          totals={summaryData.clientSummary.totals}
          rows={summaryData.clientSummary.rows}
        />
      )}

      {/* ─── SECTION 2: BROKER SETTLEMENT CLEARING ─────────────────────────── */}
      {summaryData && (
        <BrokerSummarySection
          totals={summaryData.brokerSummary.totals}
          rows={summaryData.brokerSummary.rows}
        />
      )}

      {/* ─── SECTION 3: RECONCILIATION & FIRM MARGIN ───────────────────────── */}
      {summaryData && (
        <ReconciliationSection reconciliation={summaryData.reconciliation} />
      )}
    </div>
  );
}
