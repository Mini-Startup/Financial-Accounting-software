'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { ReportControlsBar } from '@/components/reports/ReportControlsBar';
import { SettlementSummaryCards } from '@/components/reports/SettlementSummaryCards';
import { ClientSummarySection } from '@/components/reports/ClientSummarySection';
import { BrokerSummarySection } from '@/components/reports/BrokerSummarySection';
import { ReconciliationSection } from '@/components/reports/ReconciliationSection';
import {
  generateCsvString,
  downloadCsvFile,
  formatExportFilename,
  triggerPrint,
} from '@/components/reports/ReportExportUtils';
import { SettlementSummaryReportResponse } from '@/components/reports/types';
import { DropdownOption } from '@/components/ui/UniversalDropdown';

export default function SettlementSummaryPage() {
  const [settlementId, setSettlementId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

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

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <ReportHeader
        title="Financial Settlement Sheet"
        subtitle="Executive double-entry clearing statement with client net, broker net, and equilibrium verification"
        periodLabel="Cycle Period"
        asOfDate={
          summaryData?.settlement
            ? `${summaryData.settlement.fromDate} to ${summaryData.settlement.toDate}`
            : undefined
        }
        isLoading={isLoading}
        onRefresh={fetchSummaryReport}
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
