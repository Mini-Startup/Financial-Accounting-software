'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { ReportControlsBar } from '@/components/reports/ReportControlsBar';
import { NetPositionCards } from '@/components/reports/NetPositionCards';
import { NetPositionTable } from '@/components/reports/NetPositionTable';
import {
  generateCsvString,
  downloadCsvFile,
  formatExportFilename,
  triggerPrint,
} from '@/components/reports/ReportExportUtils';
import { downloadReportPdf, type PdfExportGroup, type PdfExportKpi } from '@/lib/pdf/reportPdfGenerator';
import { NetPositionReportResponse, GroupByDimension } from '@/components/reports/types';
import { DropdownOption } from '@/components/ui/UniversalDropdown';
import { UniversalPageDropzone } from '@/components/ui/UniversalPageDropzone';
import { TradeImportModal } from '@/components/trades/TradeImportModal';
import { useRouter } from 'next/navigation';

export default function NetPositionReportPage() {
  const router = useRouter();
  const [isTradeImportOpen, setIsTradeImportOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByDimension>('CLIENT');
  const [asOfDate, setAsOfDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [accountId, setAccountId] = useState<string>('');
  const [brokerId, setBrokerId] = useState<string>('');
  const [scriptId, setScriptId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [reportData, setReportData] = useState<NetPositionReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter options for dropdowns
  const [clientOptions, setClientOptions] = useState<DropdownOption[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<DropdownOption[]>([]);
  const [scriptOptions, setScriptOptions] = useState<DropdownOption[]>([]);

  // Fetch reference dropdown data on mount
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [accRes, scrRes] = await Promise.all([
          apiFetch('/account-masters'),
          apiFetch('/scripts'),
        ]);

        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs)) {
            const clients = accs
              .filter((a: any) => a.group?.name?.toUpperCase()?.includes('CLIENT') || true)
              .map((a: any) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }));
            setClientOptions(clients);

            const brokers = accs
              .filter((a: any) => a.group?.name?.toUpperCase()?.includes('BROKER'))
              .map((a: any) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }));
            setBrokerOptions(brokers.length > 0 ? brokers : clients);
          }
        }

        if (scrRes.ok) {
          const scrs = await scrRes.json();
          if (Array.isArray(scrs)) {
            setScriptOptions(
              scrs.map((s: any) => ({
                value: s.id,
                label: s.fullName || s.shortName || s.symbol || s.id,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Failed to load filter options:', err);
      }
    }
    loadDropdowns();
  }, []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('groupBy', groupBy);
      if (asOfDate) params.set('asOfDate', asOfDate);
      if (accountId) params.set('accountId', accountId);
      if (brokerId) params.set('brokerId', brokerId);
      if (scriptId) params.set('scriptId', scriptId);

      const res = await apiFetch(`/reports/net-position?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data: NetPositionReportResponse = await res.json();
      setReportData(data);
    } catch (err) {
      toast.error('Failed to load Net Position Report', {
        description: (err as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [groupBy, asOfDate, accountId, brokerId, scriptId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Client-side search filtering across groups and positions
  const filteredGroups = useMemo(() => {
    if (!reportData?.groups) return [];
    if (!searchTerm.trim()) return reportData.groups;

    const term = searchTerm.toLowerCase();
    return reportData.groups
      .map((g) => {
        const matchesGroup =
          g.code.toLowerCase().includes(term) || g.name.toLowerCase().includes(term);

        if (matchesGroup) return g;

        const matchingPositions = g.positions.filter(
          (p) =>
            p.securityName.toLowerCase().includes(term) ||
            p.scriptFullName.toLowerCase().includes(term) ||
            p.scriptShortName.toLowerCase().includes(term)
        );

        if (matchingPositions.length > 0) {
          return {
            ...g,
            positions: matchingPositions,
          };
        }
        return null;
      })
      .filter((g): g is typeof reportData.groups[0] => g !== null);
  }, [reportData, searchTerm]);

  // CSV Export Handler
  const handleExportCsv = () => {
    if (!reportData || !reportData.groups) {
      toast.error('No data available to export');
      return;
    }

    const headers = [
      'Dimension',
      'Entity Code',
      'Entity Name',
      'Security Name',
      'Expiry (DD-MM-YY)',
      'Buy Qty',
      'Buy Avg Rate',
      'Sell Qty',
      'Sell Avg Rate',
      'Net Qty',
      'Market Lot',
      'Total Units',
      'Net Avg Cost',
      'Closing Rate',
      'Market Value',
      'Unrealized MTM PnL',
    ];

    const rows: (string | number)[][] = [];

    for (const g of reportData.groups) {
      for (const p of g.positions) {
        rows.push([
          g.category,
          g.code,
          g.name,
          p.securityName,
          p.expiryFormatted || '',
          p.buyQty,
          p.buyAvgRate > 0 ? p.buyAvgRate.toFixed(4) : '',
          p.sellQty,
          p.sellAvgRate > 0 ? p.sellAvgRate.toFixed(4) : '',
          p.netQty,
          p.marketLot,
          p.totalUnits,
          p.netAvgRate > 0 ? p.netAvgRate.toFixed(4) : '',
          p.closingRate !== null ? p.closingRate.toFixed(4) : 'Pending',
          p.marketValue.toFixed(2),
          p.unrealizedPnL.toFixed(2),
        ]);
      }
    }

    const csv = generateCsvString(headers, rows);
    const filename = formatExportFilename('Net_Position_Report', groupBy);
    downloadCsvFile(filename, csv);
    toast.success('Net Position Report exported to CSV');
  };

  const handlePreviewReport = () => {
    const params = new URLSearchParams();
    params.set('type', 'net-position');
    params.set('groupBy', groupBy);
    if (asOfDate) params.set('asOfDate', asOfDate);
    if (accountId) params.set('entityId', accountId);
    if (brokerId) params.set('brokerId', brokerId);
    if (scriptId) params.set('scriptId', scriptId);
    window.open(`/report-viewer?${params.toString()}`, '_blank');
  };

  const handleExportPdf = () => {
    if (!reportData?.groups || reportData.groups.length === 0) {
      toast.error('No position data available to export');
      return;
    }
    const headers = ['Symbol / Script', 'Expiry', 'Buy Qty', 'Buy Avg', 'Sell Qty', 'Sell Avg', 'Net Qty', 'Closing Rate', 'Market Value', 'Unrealized PnL'];
    const groups: PdfExportGroup[] = reportData.groups.map((g) => ({
      groupTitle: `${groupBy}: ${g.code} - ${g.name}`,
      rows: g.positions.map((p) => [
        p.securityName,
        p.expiryFormatted || '-',
        p.buyQty,
        p.buyAvgRate > 0 ? p.buyAvgRate.toFixed(2) : '-',
        p.sellQty,
        p.sellAvgRate > 0 ? p.sellAvgRate.toFixed(2) : '-',
        p.netQty,
        p.closingRate !== null ? p.closingRate.toFixed(2) : 'Pending',
        p.marketValue.toFixed(2),
        p.unrealizedPnL.toFixed(2),
      ]),
      subtotalRow: [
        `Subtotal (${g.name || g.code})`,
        '-',
        g.totals.buyQty,
        '-',
        g.totals.sellQty,
        '-',
        g.totals.netQty,
        '-',
        g.totals.marketValue.toFixed(2),
        g.totals.unrealizedPnL.toFixed(2),
      ],
    }));

    const grandTotalRow = [
      'GRAND TOTAL',
      '-',
      reportData.groups.reduce((acc, g) => acc + g.totals.buyQty, 0),
      '-',
      reportData.groups.reduce((acc, g) => acc + g.totals.sellQty, 0),
      '-',
      reportData.groups.reduce((acc, g) => acc + g.totals.netQty, 0),
      '-',
      (reportData.summary?.totalNotionalMarketValue || 0).toFixed(2),
      (reportData.summary?.totalUnrealizedPnL || 0).toFixed(2),
    ];

    const kpis: PdfExportKpi[] = [
      { label: 'Open Trades', value: String(reportData.summary?.totalOpenTrades || 0) },
      { label: 'Open Contracts', value: String(reportData.summary?.totalOpenContracts || 0) },
      { label: 'Notional Market Value', value: (reportData.summary?.totalNotionalMarketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
      {
        label: 'Unrealized MTM PnL',
        value: (reportData.summary?.totalUnrealizedPnL || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
        color: (reportData.summary?.totalUnrealizedPnL || 0) >= 0 ? 'green' : 'red',
      },
    ];

    downloadReportPdf({
      reportTitle: 'Net Position Report (Open Positions)',
      reportSubtitle: `Open contract exposures aggregated by ${groupBy.toLowerCase()}`,
      periodLabel: 'As of Date',
      asOfDate: reportData.asOfDate || asOfDate,
      headers,
      groups,
      grandTotalRow,
      kpis,
      columnAlignments: ['left', 'center', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
    });
    toast.success('Net Position Report downloaded as PDF');
  };

  const handleResetFilters = () => {
    setAccountId('');
    setBrokerId('');
    setScriptId('');
    setSearchTerm('');
    setAsOfDate(new Date().toISOString().split('T')[0]);
  };

  const handlePageFileDrop = (file: File) => {
    const lower = file.name.toLowerCase();
    if (lower.includes('position') || lower.includes('closing') || lower.includes('open_pos')) {
      toast.info('Redirecting to Closing Rates & Position Verification...', {
        description: `Importing ${file.name} for position reconciliation.`,
      });
      router.push('/closing-rates?import=true');
    } else {
      setDroppedFile(file);
      setIsTradeImportOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Universal Drag & Drop File Listener on Open Position page */}
      <UniversalPageDropzone
        onFileDrop={handlePageFileDrop}
        title="Drop File to Import"
        subtitle="Drop trade file or open position CSV anywhere to start import & validation"
      />

      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <ReportHeader
        title="Open Position Report (Net Position)"
        subtitle="Live open positions, contract exposures, and mark-to-market valuations"
        periodLabel="As of Date"
        asOfDate={reportData?.asOfDate || asOfDate}
        isLoading={isLoading}
        onRefresh={fetchReport}
        onPreviewReport={handlePreviewReport}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        onPrint={triggerPrint}
      />

      {/* ─── CONTROLS BAR ──────────────────────────────────────────────────── */}
      <ReportControlsBar
        groupBy={groupBy}
        onGroupByChange={(dim) => setGroupBy(dim)}
        asOfDate={asOfDate}
        onAsOfDateChange={setAsOfDate}
        clientId={accountId}
        onClientChange={setAccountId}
        clientOptions={clientOptions}
        brokerId={brokerId}
        onBrokerChange={setBrokerId}
        brokerOptions={brokerOptions}
        scriptId={scriptId}
        onScriptChange={setScriptId}
        scriptOptions={scriptOptions}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter entities or securities..."
        onResetFilters={handleResetFilters}
      />

      {/* ─── KPI METRIC CARDS ──────────────────────────────────────────────── */}
      {reportData && <NetPositionCards summary={reportData.summary} />}

      {/* ─── POSITION TREE TABLE ───────────────────────────────────────────── */}
      <NetPositionTable groups={filteredGroups} />

      {/* Trade Import Modal (Mounted if trades file dropped on open position report) */}
      <TradeImportModal
        isOpen={isTradeImportOpen}
        onClose={() => {
          setIsTradeImportOpen(false);
          setDroppedFile(null);
        }}
        initialFile={droppedFile}
        onComplete={() => {
          setIsTradeImportOpen(false);
          setDroppedFile(null);
          fetchReport();
        }}
      />
    </div>
  );
}
