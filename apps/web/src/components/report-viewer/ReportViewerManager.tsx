'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Printer,
  Download,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Calendar,
  Building2,
  Coins,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { formatCurrencySymbol } from '@/utils/currency';
import { cn } from '@/utils/cn';
import { ExportModal, type ExportConfig } from './ExportModal';
import { generateReportPdf, downloadReportPdf, type PdfExportOptions, type PdfExportGroup, type PdfExportKpi } from '@/lib/pdf/reportPdfGenerator';
import { downloadReportExcel } from '@/lib/excel/reportExcelGenerator';
import type {
  NetPositionReportResponse,
  InvoiceReportResponse,
  SettlementDetailAuditResponse,
  SettlementSummaryReportResponse,
  GroupByDimension
} from '@/components/reports/types';

export function ReportViewerManager() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query Parameters
  const initialType = searchParams.get('type') || 'net-position';
  const initialGroupBy = (searchParams.get('groupBy')?.toUpperCase() as GroupByDimension) || 'CLIENT';
  const initialAsOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];
  const initialFromDate = searchParams.get('fromDate') || '';
  const initialToDate = searchParams.get('toDate') || '';
  const initialEntityId = searchParams.get('entityId') || searchParams.get('accountId') || '';
  const initialEntityType = (searchParams.get('entityType')?.toUpperCase() as 'CLIENT' | 'BROKER') || 'CLIENT';
  const initialSettlementId = searchParams.get('settlementId') || '';
  const initialScriptId = searchParams.get('scriptId') || '';

  // Active state
  const [reportType, setReportType] = useState<string>(initialType);
  const [groupBy, setGroupBy] = useState<GroupByDimension>(initialGroupBy);
  const [asOfDate, setAsOfDate] = useState<string>(initialAsOfDate);
  const [fromDate, setFromDate] = useState<string>(initialFromDate);
  const [toDate, setToDate] = useState<string>(initialToDate);
  const [entityId, setEntityId] = useState<string>(initialEntityId);
  const [entityType, setEntityType] = useState<'CLIENT' | 'BROKER'>(initialEntityType);
  const [settlementId, setSettlementId] = useState<string>(initialSettlementId);
  const [scriptId, setScriptId] = useState<string>(initialScriptId);

  // Pagination state
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Loading & Data states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [netPositionData, setNetPositionData] = useState<NetPositionReportResponse | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceReportResponse | null>(null);
  const [settlementDetailData, setSettlementDetailData] = useState<SettlementDetailAuditResponse | null>(null);
  const [settlementSummaryData, setSettlementSummaryData] = useState<SettlementSummaryReportResponse | null>(null);

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Dropdown reference options
  const [accountsList, setAccountsList] = useState<{ id: string; code: string; name: string; isBroker?: boolean }[]>([]);
  const [scriptsList, setScriptsList] = useState<{ id: string; name: string }[]>([]);
  const [settlementsList, setSettlementsList] = useState<{ id: string; name: string }[]>([]);

  // Load dropdown references
  useEffect(() => {
    async function loadReferences() {
      try {
        const [accRes, scrRes, setRes] = await Promise.all([
          apiFetch('/account-masters'),
          apiFetch('/scripts'),
          apiFetch('/settlement/settlements'),
        ]);

        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs)) {
            setAccountsList(
              accs.map((a: any) => ({
                id: a.id,
                code: a.code,
                name: a.name,
                isBroker: a.group?.name?.toUpperCase()?.includes('BROKER'),
              }))
            );
          }
        }

        if (scrRes.ok) {
          const scrs = await scrRes.json();
          if (Array.isArray(scrs)) {
            setScriptsList(
              scrs.map((s: any) => ({
                id: s.id,
                name: s.fullName || s.shortName || s.symbol || s.id,
              }))
            );
          }
        }

        if (setRes.ok) {
          const sets = await setRes.json();
          if (Array.isArray(sets)) {
            setSettlementsList(sets.map((s: any) => ({ id: s.id, name: s.name })));
          }
        }
      } catch (err) {
        console.warn('Failed to load reference lists:', err);
      }
    }
    loadReferences();
  }, []);

  // Fetch active report data
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      if (reportType === 'net-position' || reportType === 'open-position') {
        const params = new URLSearchParams();
        params.set('groupBy', groupBy);
        if (asOfDate) params.set('asOfDate', asOfDate);
        if (entityId) {
          if (entityType === 'BROKER') params.set('brokerId', entityId);
          else params.set('accountId', entityId);
        }
        if (scriptId) params.set('scriptId', scriptId);

        const res = await apiFetch(`/reports/net-position?${params.toString()}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data: NetPositionReportResponse = await res.json();
        setNetPositionData(data);
      } else if (reportType === 'invoice') {
        const params = new URLSearchParams();
        params.set('entityType', entityType);
        if (entityId && entityId !== 'ALL') params.set('entityId', entityId);
        if (settlementId && settlementId !== 'LATEST') params.set('settlementId', settlementId);

        const res = await apiFetch(`/reports/invoice?${params.toString()}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data: InvoiceReportResponse = await res.json();
        setInvoiceData(data);
      } else if (reportType === 'settlement' || reportType === 'settlement-detail') {
        const params = new URLSearchParams();
        if (settlementId) params.set('settlementId', settlementId);
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
        if (entityId) {
          if (entityType === 'BROKER') params.set('brokerId', entityId);
          else params.set('clientId', entityId);
        }

        const res = await apiFetch(`/reports/settlement-detail?${params.toString()}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data: SettlementDetailAuditResponse = await res.json();
        setSettlementDetailData(data);
      } else if (reportType === 'settlement-summary') {
        const params = new URLSearchParams();
        if (settlementId) params.set('settlementId', settlementId);
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);

        const res = await apiFetch(`/reports/settlement-summary?${params.toString()}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data: SettlementSummaryReportResponse = await res.json();
        setSettlementSummaryData(data);
      }
    } catch (err: any) {
      toast.error('Failed to load report data', {
        description: err.message || 'Error communicating with server.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportType, groupBy, asOfDate, fromDate, toDate, entityId, entityType, settlementId, scriptId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Compute table headers, rows, and totals based on active report type
  const reportConfig = useMemo(() => {
    if (reportType === 'net-position' || reportType === 'open-position') {
      const title = 'Net Position Report (Open Positions)';
      const subtitle = `Contract exposures and valuations aggregated by ${groupBy.toLowerCase()}`;
      const headers = ['Symbol / Script', 'Expiry', 'Buy Qty', 'Buy Avg', 'Sell Qty', 'Sell Avg', 'Net Qty', 'Closing Rate', 'Market Value', 'Unrealized PnL'];
      const alignments: ('left' | 'center' | 'right')[] = ['left', 'center', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];

      const groups: {
        groupTitle?: string;
        rows: (string | number)[][];
        subtotalRow?: (string | number)[];
      }[] = [];

      let totalRows = 0;

      netPositionData?.groups?.forEach((g) => {
        const rows: (string | number)[][] = g.positions.map((p) => [
          p.securityName || p.scriptShortName,
          p.expiryFormatted || '-',
          p.buyQty,
          p.buyAvgRate > 0 ? p.buyAvgRate.toFixed(2) : '-',
          p.sellQty,
          p.sellAvgRate > 0 ? p.sellAvgRate.toFixed(2) : '-',
          p.netQty,
          p.closingRate !== null ? p.closingRate.toFixed(2) : 'Pending',
          p.marketValue.toFixed(2),
          p.unrealizedPnL.toFixed(2),
        ]);
        totalRows += rows.length;

        const subtotalRow: (string | number)[] = [
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
        ];

        groups.push({
          groupTitle: `${groupBy}: ${g.code} - ${g.name}`,
          rows,
          subtotalRow,
        });
      });

      const grandTotalRow: (string | number)[] = [
        'GRAND TOTAL',
        '-',
        netPositionData?.groups?.reduce((acc, g) => acc + g.totals.buyQty, 0) || 0,
        '-',
        netPositionData?.groups?.reduce((acc, g) => acc + g.totals.sellQty, 0) || 0,
        '-',
        netPositionData?.groups?.reduce((acc, g) => acc + g.totals.netQty, 0) || 0,
        '-',
        (netPositionData?.summary?.totalNotionalMarketValue || 0).toFixed(2),
        (netPositionData?.summary?.totalUnrealizedPnL || 0).toFixed(2),
      ];

      const kpis: PdfExportKpi[] = [
        { label: 'Open Trades', value: String(netPositionData?.summary?.totalOpenTrades || 0) },
        { label: 'Open Contracts', value: String(netPositionData?.summary?.totalOpenContracts || 0) },
        { label: 'Notional Value', value: (netPositionData?.summary?.totalNotionalMarketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
        {
          label: 'Unrealized PnL',
          value: (netPositionData?.summary?.totalUnrealizedPnL || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
          color: (netPositionData?.summary?.totalUnrealizedPnL || 0) >= 0 ? 'green' : 'red',
        },
      ];

      return {
        title,
        subtitle,
        periodLabel: 'As of Date',
        asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow,
        kpis,
        totalRows,
      };
    } else if (reportType === 'invoice') {
      const title = 'Client & Broker Invoice Statement';
      const subtitle = `Settlement contract billing statement for ${entityType.toLowerCase()}s`;
      const headers = ['Script / Instrument', 'Buy Qty', 'Sell Qty', 'Net Bill Amount'];
      const alignments: ('left' | 'center' | 'right')[] = ['left', 'right', 'right', 'right'];

      const groups: {
        groupTitle?: string;
        rows: (string | number)[][];
        subtotalRow?: (string | number)[];
      }[] = [];

      let totalRows = 0;

      invoiceData?.invoices?.forEach((inv) => {
        const rows: (string | number)[][] = inv.scripts.map((s) => [
          s.securityName,
          s.totalBuyQty,
          s.totalSellQty,
          s.netAmount.toFixed(2),
        ]);
        totalRows += rows.length;

        const subtotalRow: (string | number)[] = [
          `Total (${inv.entityName})`,
          inv.totalBuyQty,
          inv.totalSellQty,
          inv.netPayableOrReceivable.toFixed(2),
        ];

        groups.push({
          groupTitle: `${entityType}: ${inv.entityCode} - ${inv.entityName} | Cycle: ${inv.settlementName || invoiceData.settlementName || 'Latest'}`,
          rows,
          subtotalRow,
        });
      });

      const grandTotalRow: (string | number)[] = [
        'GRAND TOTAL',
        invoiceData?.invoices?.reduce((acc, inv) => acc + inv.totalBuyQty, 0) || 0,
        invoiceData?.invoices?.reduce((acc, inv) => acc + inv.totalSellQty, 0) || 0,
        (invoiceData?.invoices?.reduce((acc, inv) => acc + inv.netPayableOrReceivable, 0) || 0).toFixed(2),
      ];

      const kpis: PdfExportKpi[] = [
        { label: 'Total Entities', value: String(invoiceData?.invoices?.length || 0) },
        { label: 'Settlement Cycle', value: invoiceData?.settlementName || 'Latest' },
        {
          label: 'Total Net Settlement',
          value: (invoiceData?.invoices?.reduce((acc, inv) => acc + inv.netPayableOrReceivable, 0) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
        },
      ];

      return {
        title,
        subtitle,
        periodLabel: 'Settlement',
        asOfDate: invoiceData?.settlementName || asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow,
        kpis,
        totalRows,
      };
    } else if (reportType === 'settlement' || reportType === 'settlement-detail') {
      const title = 'Settlement Detail & Audit Report';
      const subtitle = `Transaction ledger verification for ${settlementDetailData?.settlementInfo?.name || 'Cycle'}`;
      const headers = ['Trade Date', 'Trade #', 'Security', 'Type', 'Broker', 'Quantity', 'Rate', 'Value', 'PnL'];
      const alignments: ('left' | 'center' | 'right')[] = ['center', 'center', 'left', 'center', 'left', 'right', 'right', 'right', 'right'];

      const groups: {
        groupTitle?: string;
        rows: (string | number)[][];
        subtotalRow?: (string | number)[];
      }[] = [];

      let totalRows = 0;

      settlementDetailData?.clientAuditGroups?.forEach((g) => {
        const rows: (string | number)[][] = g.trades.map((t) => [
          formatDateToDDMMYY(t.tradeDate),
          t.tradeNumber,
          t.securityName,
          t.tradeType,
          t.brokerCode || '-',
          t.quantity,
          t.rate.toFixed(2),
          t.tradeValue.toFixed(2),
          t.pnl.toFixed(2),
        ]);
        totalRows += rows.length;

        const subtotalRow: (string | number)[] = [
          `Subtotal (${g.clientName})`,
          '-',
          '-',
          '-',
          '-',
          g.subtotals.buyQty + g.subtotals.sellQty,
          '-',
          (g.subtotals.buyValue + g.subtotals.sellValue).toFixed(2),
          g.subtotals.cyclePnL.toFixed(2),
        ];

        groups.push({
          groupTitle: `Client: ${g.clientCode} - ${g.clientName}`,
          rows,
          subtotalRow,
        });
      });

      const grandTotalRow: (string | number)[] = [
        'TOTALS',
        '-',
        '-',
        '-',
        '-',
        settlementDetailData?.metrics?.totalTradedUnits || 0,
        '-',
        ((settlementDetailData?.metrics?.grossBuyValue || 0) + (settlementDetailData?.metrics?.grossSellValue || 0)).toFixed(2),
        (settlementDetailData?.metrics?.totalCyclePnL || 0).toFixed(2),
      ];

      const kpis: PdfExportKpi[] = [
        { label: 'Total Trades', value: String(settlementDetailData?.metrics?.totalTrades || 0) },
        { label: 'Regular Trades', value: String(settlementDetailData?.metrics?.regularCount || 0) },
        { label: 'Settlement Trades', value: String(settlementDetailData?.metrics?.settlementCount || 0) },
        {
          label: 'Cycle PnL',
          value: (settlementDetailData?.metrics?.totalCyclePnL || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
          color: (settlementDetailData?.metrics?.totalCyclePnL || 0) >= 0 ? 'green' : 'red',
        },
      ];

      return {
        title,
        subtitle,
        periodLabel: 'Settlement Period',
        asOfDate: settlementDetailData?.settlementInfo ? `${formatDateToDDMMYY(settlementDetailData.settlementInfo.fromDate)} - ${formatDateToDDMMYY(settlementDetailData.settlementInfo.toDate)}` : asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow,
        kpis,
        totalRows,
      };
    } else {
      // Settlement Summary
      const title = 'Financial Settlement Summary Sheet';
      const subtitle = `Consolidated counterparty settlement balance sheet for ${settlementSummaryData?.settlement?.name || 'Cycle'}`;
      const headers = ['Account Code', 'Account Name', 'Buy Value', 'Sell Value', 'Trading PnL', 'Brokerage / Charges', 'Net Settlement', 'Status'];
      const alignments: ('left' | 'center' | 'right')[] = ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'center'];

      const clientRows: (string | number)[][] = settlementSummaryData?.clientSummary?.rows?.map((r) => [
        r.accountCode,
        r.accountName,
        r.buyValue.toFixed(2),
        r.sellValue.toFixed(2),
        r.grossPnL.toFixed(2),
        r.brokerage.toFixed(2),
        r.netAmount.toFixed(2),
        r.ledgerStatus,
      ]) || [];

      const brokerRows: (string | number)[][] = settlementSummaryData?.brokerSummary?.rows?.map((r) => [
        r.brokerCode,
        r.brokerName,
        r.buyValue.toFixed(2),
        r.sellValue.toFixed(2),
        r.netTradingAmount.toFixed(2),
        r.charges.toFixed(2),
        r.netAmount.toFixed(2),
        r.ledgerStatus,
      ]) || [];

      const groups: {
        groupTitle?: string;
        rows: (string | number)[][];
        subtotalRow?: (string | number)[];
      }[] = [
        {
          groupTitle: `Clients Settlement Summary (${clientRows.length} Accounts)`,
          rows: clientRows,
          subtotalRow: [
            'Total Clients',
            '-',
            (settlementSummaryData?.clientSummary?.totals?.totalBuyValue || 0).toFixed(2),
            (settlementSummaryData?.clientSummary?.totals?.totalSellValue || 0).toFixed(2),
            (settlementSummaryData?.clientSummary?.totals?.grossTradingPnL || 0).toFixed(2),
            (settlementSummaryData?.clientSummary?.totals?.totalBrokerage || 0).toFixed(2),
            (settlementSummaryData?.clientSummary?.totals?.netSettlementAmount || 0).toFixed(2),
            '-',
          ],
        },
        {
          groupTitle: `Brokers Settlement Summary (${brokerRows.length} Accounts)`,
          rows: brokerRows,
          subtotalRow: [
            'Total Brokers',
            '-',
            (settlementSummaryData?.brokerSummary?.totals?.totalBuyValue || 0).toFixed(2),
            (settlementSummaryData?.brokerSummary?.totals?.totalSellValue || 0).toFixed(2),
            (settlementSummaryData?.brokerSummary?.totals?.netTradingAmount || 0).toFixed(2),
            (settlementSummaryData?.brokerSummary?.totals?.totalCharges || 0).toFixed(2),
            (settlementSummaryData?.brokerSummary?.totals?.netSettlementAmount || 0).toFixed(2),
            '-',
          ],
        },
      ];

      const kpis: PdfExportKpi[] = [
        { label: 'Client Net', value: (settlementSummaryData?.reconciliation?.totalClientNet || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
        { label: 'Broker Net', value: (settlementSummaryData?.reconciliation?.totalBrokerNet || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
        { label: 'Firm Net Profit', value: (settlementSummaryData?.reconciliation?.firmNetRealizedProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), color: 'green' },
        {
          label: 'Equilibrium',
          value: settlementSummaryData?.reconciliation?.isBalanced ? 'BALANCED' : 'IMBALANCE',
          color: settlementSummaryData?.reconciliation?.isBalanced ? 'green' : 'red',
        },
      ];

      return {
        title,
        subtitle,
        periodLabel: 'Settlement Period',
        asOfDate: settlementSummaryData?.settlement ? `${formatDateToDDMMYY(settlementSummaryData.settlement.fromDate)} - ${formatDateToDDMMYY(settlementSummaryData.settlement.toDate)}` : asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow: undefined,
        kpis,
        totalRows: clientRows.length + brokerRows.length,
      };
    }
  }, [reportType, groupBy, asOfDate, netPositionData, invoiceData, settlementDetailData, settlementSummaryData, entityType]);

  // Paginated groups for UI rendering
  const paginatedGroups = useMemo(() => {
    if (pageSize === 'all') return reportConfig.groups;

    const limit = typeof pageSize === 'number' ? pageSize : 25;
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;

    let currentIndex = 0;
    const result: typeof reportConfig.groups = [];

    for (const group of reportConfig.groups) {
      const groupRows = group.rows;
      const groupLength = groupRows.length;
      const groupStartIndex = currentIndex;
      const groupEndIndex = currentIndex + groupLength;

      if (groupEndIndex > startIndex && groupStartIndex < endIndex) {
        // Overlaps with current page
        const sliceStart = Math.max(0, startIndex - groupStartIndex);
        const sliceEnd = Math.min(groupLength, endIndex - groupStartIndex);
        result.push({
          groupTitle: group.groupTitle,
          rows: groupRows.slice(sliceStart, sliceEnd),
          subtotalRow: sliceEnd === groupLength ? group.subtotalRow : undefined,
        });
      }

      currentIndex += groupLength;
    }

    return result;
  }, [reportConfig.groups, pageSize, currentPage]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all' || reportConfig.totalRows === 0) return 1;
    return Math.ceil(reportConfig.totalRows / (typeof pageSize === 'number' ? pageSize : 25));
  }, [reportConfig.totalRows, pageSize]);

  const currentPageRowsCount = useMemo(() => {
    return paginatedGroups.reduce((acc, g) => acc + g.rows.length, 0);
  }, [paginatedGroups]);

  // Handle Export execution from Modal
  const handleExportExecute = (config: ExportConfig) => {
    setIsExporting(true);
    try {
      const exportGroups = config.scope === 'page' ? paginatedGroups : reportConfig.groups;

      const exportOptions: PdfExportOptions = {
        orientation: config.orientation,
        includeKpis: config.includeKpis,
        includeSubtotals: config.includeSubtotals,
        includeTotals: config.includeTotals,
        reportTitle: reportConfig.title,
        reportSubtitle: reportConfig.subtitle,
        periodLabel: reportConfig.periodLabel,
        asOfDate: reportConfig.asOfDate,
        filterSummary: [
          `Format: ${config.format.toUpperCase()}`,
          `Scope: ${config.scope === 'page' ? `Page ${currentPage}` : 'All Records'}`,
        ],
        kpis: reportConfig.kpis,
        headers: reportConfig.headers,
        columnAlignments: reportConfig.alignments,
        groups: exportGroups,
        grandTotalRow: reportConfig.grandTotalRow,
      };

      if (config.format === 'pdf') {
        downloadReportPdf(exportOptions);
        toast.success('PDF Document generated and downloaded successfully!');
      } else {
        downloadReportExcel(exportOptions);
        toast.success('Excel Spreadsheet exported successfully!');
      }
      setIsExportModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export document', {
        description: err.message || 'Error occurred while creating export file.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Close tab or go back
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.opener) {
      window.close();
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-body antialiased">
      {/* ─── TOP CONTROL BAR (STICKY, HIDDEN ON PRINT) ────────────────────── */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0A1A4A] via-[#102E7A] to-[#1D4ED8] text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Back & Title Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
              title="Return to previous window"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="h-5 w-px bg-white/20" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">{reportConfig.title}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-blue-100 uppercase tracking-wider">
                  Viewer
                </span>
              </div>
              <p className="text-[11px] text-blue-200 hidden sm:block">{reportConfig.subtitle}</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchReport}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-blue-200" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={() => {
                downloadReportExcel({
                  reportTitle: reportConfig.title,
                  reportSubtitle: reportConfig.subtitle,
                  periodLabel: reportConfig.periodLabel,
                  asOfDate: reportConfig.asOfDate,
                  headers: reportConfig.headers,
                  groups: reportConfig.groups,
                  grandTotalRow: reportConfig.grandTotalRow,
                  kpis: reportConfig.kpis,
                });
                toast.success('Excel Spreadsheet downloaded');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
              title="Download Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#0A1A4A] hover:bg-blue-50 transition-colors cursor-pointer shadow-md"
              title="Open Export Options"
            >
              <Download className="w-3.5 h-3.5 text-[#2652C8]" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-bar: Inline Filter Controls */}
        <div className="border-t border-white/10 bg-slate-900/30 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-blue-200 font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>

              {/* Group By selector (for net position) */}
              {(reportType === 'net-position' || reportType === 'open-position') && (
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-white/70">Group By:</span>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupByDimension)}
                    className="bg-transparent text-white font-bold outline-hidden cursor-pointer"
                  >
                    <option value="CLIENT" className="text-slate-900">Client</option>
                    <option value="BROKER" className="text-slate-900">Broker</option>
                    <option value="SCRIPT" className="text-slate-900">Script</option>
                  </select>
                </div>
              )}

              {/* Entity Type Toggle (for invoice) */}
              {reportType === 'invoice' && (
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-white/70">Entity:</span>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as 'CLIENT' | 'BROKER')}
                    className="bg-transparent text-white font-bold outline-hidden cursor-pointer"
                  >
                    <option value="CLIENT" className="text-slate-900">Clients</option>
                    <option value="BROKER" className="text-slate-900">Brokers</option>
                  </select>
                </div>
              )}

              {/* Date Filter (DD-MM-YYYY) */}
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Calendar className="w-3 h-3 text-blue-200" />
                <span className="text-white/70">As of:</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="bg-transparent text-white font-bold outline-hidden text-xs cursor-pointer"
                />
              </div>

              {/* Settlement Selector (if settlements exist) */}
              {settlementsList.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-white/70">Cycle:</span>
                  <select
                    value={settlementId}
                    onChange={(e) => setSettlementId(e.target.value)}
                    className="bg-transparent text-white font-bold outline-hidden cursor-pointer max-w-[140px] truncate"
                  >
                    <option value="" className="text-slate-900">Latest / All</option>
                    {settlementsList.map((s) => (
                      <option key={s.id} value={s.id} className="text-slate-900">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Total Records Counter */}
            <div className="text-blue-200 font-mono text-[11px]">
              Total Records: <strong className="text-white">{reportConfig.totalRows}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* ─── DOCUMENT CANVAS (PRINT READY) ─────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/90 p-8 sm:p-12 print:shadow-none print:border-none print:p-0 print:max-w-full">
          {/* 1. Official Branded Header */}
          <div className="border-b border-slate-200 pb-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#0A1A4A] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                    B
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-[#0A1A4A]">BIZZMATE FINANCIAL SYSTEMS</h2>
                    <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Institutional Settlement & Reporting</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-3">{reportConfig.title}</h3>
                <p className="text-xs text-slate-500 font-medium">{reportConfig.subtitle}</p>
              </div>

              {/* Right: Metadata Seal */}
              <div className="text-right text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 shrink-0">
                <div>
                  <span className="text-slate-500">{reportConfig.periodLabel}:</span>{' '}
                  <strong className="text-slate-900 font-mono">{formatDateToDDMMYY(reportConfig.asOfDate)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Generated:</span>{' '}
                  <span className="text-slate-700 font-mono">{formatDateToDDMMYY(new Date())}</span>
                </div>
                <div>
                  <span className="text-slate-500">Security:</span>{' '}
                  <span className="font-semibold text-emerald-700">Verified Confidential</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. KPI Summary Cards */}
          {reportConfig.kpis && reportConfig.kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
              {reportConfig.kpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 relative overflow-hidden"
                >
                  <div
                    className={cn(
                      'absolute top-0 left-0 right-0 h-1',
                      kpi.color === 'green' ? 'bg-emerald-500' : kpi.color === 'red' ? 'bg-rose-500' : 'bg-[#2652C8]'
                    )}
                  />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</div>
                  <div
                    className={cn(
                      'text-lg font-bold font-mono tracking-tight mt-1',
                      kpi.color === 'green' ? 'text-emerald-700' : kpi.color === 'red' ? 'text-rose-700' : 'text-slate-900'
                    )}
                  >
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Financial Data Table */}
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#2652C8]/30 border-t-[#2652C8] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Calculating and preparing financial document...</p>
            </div>
          ) : reportConfig.totalRows === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl p-8">
              <p className="text-sm font-semibold text-slate-600">No records found for the selected criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try switching the date range or account filters above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                {/* Table Header */}
                <thead>
                  <tr className="bg-[#0A1A4A] text-white">
                    {reportConfig.headers.map((h, i) => (
                      <th
                        key={i}
                        className={cn(
                          'py-2.5 px-3 font-bold tracking-wider uppercase text-[11px] border-b border-[#102E7A]',
                          reportConfig.alignments[i] === 'right' ? 'text-right' : reportConfig.alignments[i] === 'center' ? 'text-center' : 'text-left'
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body with Groups */}
                <tbody>
                  {paginatedGroups.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {/* Group Header Row */}
                      {group.groupTitle && (
                        <tr className="bg-indigo-50/70 border-y border-indigo-100">
                          <td
                            colSpan={reportConfig.headers.length}
                            className="py-2 px-3 font-bold text-indigo-900 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              <span>{group.groupTitle}</span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Detail Rows */}
                      {group.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={cn(
                            'border-b border-slate-100 hover:bg-slate-50/80 transition-colors',
                            rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          )}
                        >
                          {row.map((cell, cIdx) => {
                            const isNumeric = reportConfig.alignments[cIdx] === 'right';
                            const strVal = String(cell);
                            const isNegative = strVal.startsWith('-');

                            return (
                              <td
                                key={cIdx}
                                className={cn(
                                  'py-2 px-3 text-slate-800',
                                  isNumeric && 'font-mono text-right tabular-nums',
                                  reportConfig.alignments[cIdx] === 'center' && 'text-center',
                                  isNumeric && isNegative && 'text-rose-600 font-semibold',
                                  isNumeric && !isNegative && strVal !== '0.00' && strVal !== '0' && cIdx >= 6 && 'text-emerald-700 font-semibold'
                                )}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Subtotal Row */}
                      {group.subtotalRow && (
                        <tr className="bg-slate-100/90 font-bold border-b border-slate-300 text-slate-900">
                          {group.subtotalRow.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={cn(
                                'py-2 px-3',
                                reportConfig.alignments[cIdx] === 'right' && 'font-mono text-right tabular-nums',
                                reportConfig.alignments[cIdx] === 'center' && 'text-center'
                              )}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Grand Total Row */}
                  {reportConfig.grandTotalRow && (
                    <tr className="bg-[#0A1A4A] text-white font-extrabold text-xs">
                      {reportConfig.grandTotalRow.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={cn(
                            'py-3 px-3',
                            reportConfig.alignments[cIdx] === 'right' && 'font-mono text-right tabular-nums',
                            reportConfig.alignments[cIdx] === 'center' && 'text-center'
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Pagination Bar (Hidden on print) */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs text-slate-600 print:hidden">
            <div className="flex items-center gap-3">
              <span>Rows per page:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                {([25, 50, 100, 'all'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                      pageSize === size ? 'bg-white text-[#2652C8] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {size === 'all' ? 'All' : size}
                  </button>
                ))}
              </div>
              <span className="text-slate-400">|</span>
              <span>
                Showing <strong className="text-slate-900">{currentPageRowsCount}</strong> of{' '}
                <strong className="text-slate-900">{reportConfig.totalRows}</strong> records
              </span>
            </div>

            {/* Prev / Next controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 5. Document Footer Disclaimer */}
          <div className="mt-8 pt-4 border-t border-slate-200/80 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>This statement was generated electronically by BizzMate Accounting and is valid without physical seal.</div>
            <div>Confidential & Proprietary</div>
          </div>
        </div>
      </main>

      {/* ─── EXPORT CONFIGURATION MODAL ────────────────────────────────────── */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportTitle={reportConfig.title}
        totalRowsCount={reportConfig.totalRows}
        currentPageRowsCount={currentPageRowsCount}
        onConfirmExport={handleExportExecute}
        isExporting={isExporting}
      />
    </div>
  );
}
