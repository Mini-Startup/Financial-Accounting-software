'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Printer,
  Download,
  RefreshCw,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Layers,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Search,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { cn } from '@/utils/cn';
import { ExportModal, type ExportConfig } from './ExportModal';
import { downloadReportPdf, type PdfExportOptions } from '@/lib/pdf/reportPdfGenerator';
import { downloadReportExcel } from '@/lib/excel/reportExcelGenerator';
import type {
  NetPositionReportResponse,
  InvoiceReportResponse,
  SettlementDetailAuditResponse,
  SettlementSummaryReportResponse,
  GroupByDimension,
} from '@/components/reports/types';

interface DocumentPageChunk {
  pageNumber: number;
  title: string;
  groups: {
    groupTitle?: string;
    rows: (string | number)[][];
    subtotalRow?: (string | number)[];
  }[];
  isFirstPage: boolean;
  isLastPage: boolean;
  rowCount: number;
}

const ROWS_PER_PAGE = 22; // Natural financial ledger sheet page height

export function ReportViewerManager() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
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

  // Viewer controls: Sidebar, Zoom, Active Page
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75, 90, 100, 110, 125
  const [filterSearch, setFilterSearch] = useState<string>('');

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

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Load references
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
                isBroker: a.group?.name?.toUpperCase()?.includes('BROKER') || a.groupId === 2,
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
                name: s.fullName || s.shortName || s.symbol,
              }))
            );
          }
        }

        if (setRes.ok) {
          const setts = await setRes.json();
          if (Array.isArray(setts)) {
            setSettlementsList(
              setts.map((s: any) => ({
                id: s.id,
                name: s.name,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Failed to load reference lists:', err);
      }
    }
    loadReferences();
  }, []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      if (reportType === 'net-position') {
        const params = new URLSearchParams();
        if (asOfDate) params.set('asOfDate', asOfDate);
        if (groupBy) params.set('groupBy', groupBy);
        if (entityId) params.set('entityId', entityId);
        if (settlementId) params.set('settlementId', settlementId);
        if (scriptId) params.set('scriptId', scriptId);

        const res = await apiFetch(`/reports/net-position?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setNetPositionData(data);
      } else if (reportType === 'invoice') {
        const params = new URLSearchParams();
        params.set('entityType', entityType);
        if (entityId) params.set('entityId', entityId);
        if (settlementId) params.set('settlementId', settlementId);

        const res = await apiFetch(`/reports/invoice?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setInvoiceData(data);
      } else if (reportType === 'settlement-detail') {
        const params = new URLSearchParams();
        if (settlementId) params.set('settlementId', settlementId);
        if (entityId) params.set('clientId', entityId);
        if (scriptId) params.set('scriptId', scriptId);

        const res = await apiFetch(`/reports/settlement-detail?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSettlementDetailData(data);
      } else if (reportType === 'settlement-summary') {
        const params = new URLSearchParams();
        if (settlementId) params.set('settlementId', settlementId);

        const res = await apiFetch(`/reports/settlement-summary?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSettlementSummaryData(data);
      }
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      toast.error('Failed to load report data', {
        description: err.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportType, asOfDate, groupBy, entityId, entityType, settlementId, scriptId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Unified Report Configuration Model
  const reportConfig = useMemo(() => {
    if (reportType === 'net-position') {
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
          p.securityName,
          p.expiryFormatted || '-',
          p.buyQty,
          p.buyAvgRate ? p.buyAvgRate.toFixed(2) : '-',
          p.sellQty,
          p.sellAvgRate ? p.sellAvgRate.toFixed(2) : '-',
          p.netQty,
          p.closingRate ? p.closingRate.toFixed(2) : '-',
          p.marketValue.toFixed(2),
          p.unrealizedPnL.toFixed(2),
        ]);
        totalRows += rows.length;

        const subtotalRow: (string | number)[] = [
          `Subtotal (${g.code})`,
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

      return {
        title,
        subtitle,
        periodLabel: 'As of Date',
        asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow,
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

      return {
        title,
        subtitle,
        periodLabel: 'Invoice Date',
        asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow,
        totalRows,
      };
    } else if (reportType === 'settlement-detail') {
      const title = 'Settlement Audit Report';
      const subtitle = `Trade provenance breakdown for ${settlementDetailData?.settlementInfo?.name || 'Active Settlement'}`;
      const headers = ['Date', 'Trade No', 'Type', 'Security', 'Price', 'Traded Qty', 'Market Rate', 'Traded Value', 'Cycle PnL'];
      const alignments: ('left' | 'center' | 'center' | 'left' | 'right' | 'right' | 'right' | 'right' | 'right')[] = [
        'left',
        'center',
        'center',
        'left',
        'right',
        'right',
        'right',
        'right',
        'right',
      ];

      const groups: {
        groupTitle?: string;
        rows: (string | number)[][];
        subtotalRow?: (string | number)[];
      }[] = [];

      let totalRows = 0;

      settlementDetailData?.clientAuditGroups?.forEach((g) => {
        const rows: (string | number)[][] = (g.trades || []).map((t) => [
          formatDateToDDMMYY(t.tradeDate),
          t.tradeNumber || '-',
          t.tradeType || '-',
          t.securityName,
          t.rate.toFixed(2),
          t.quantity,
          t.settlementRate ? t.settlementRate.toFixed(2) : '-',
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

      return {
        title,
        subtitle,
        periodLabel: 'Settlement Period',
        asOfDate: settlementDetailData?.settlementInfo
          ? `${formatDateToDDMMYY(settlementDetailData.settlementInfo.fromDate)} - ${formatDateToDDMMYY(settlementDetailData.settlementInfo.toDate)}`
          : asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow,
        totalRows,
      };
    } else {
      // Settlement Summary
      const title = 'Financial Settlement Summary Sheet';
      const subtitle = `Consolidated counterparty settlement balance sheet for ${settlementSummaryData?.settlement?.name || 'Cycle'}`;
      const headers = ['Account Code', 'Account Name', 'Buy Value', 'Sell Value', 'Trading PnL', 'Brokerage / Charges', 'Net Settlement', 'Status'];
      const alignments: ('left' | 'center' | 'right')[] = ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'center'];

      const clientRows: (string | number)[][] =
        settlementSummaryData?.clientSummary?.rows?.map((r) => [
          r.accountCode,
          r.accountName,
          r.buyValue.toFixed(2),
          r.sellValue.toFixed(2),
          r.grossPnL.toFixed(2),
          r.brokerage.toFixed(2),
          r.netAmount.toFixed(2),
          r.ledgerStatus,
        ]) || [];

      const brokerRows: (string | number)[][] =
        settlementSummaryData?.brokerSummary?.rows?.map((r) => [
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

      const grandTotalRow: (string | number)[] = [
        'NET FIRM BALANCE',
        '-',
        ((settlementSummaryData?.clientSummary?.totals?.totalBuyValue || 0) + (settlementSummaryData?.brokerSummary?.totals?.totalBuyValue || 0)).toFixed(2),
        ((settlementSummaryData?.clientSummary?.totals?.totalSellValue || 0) + (settlementSummaryData?.brokerSummary?.totals?.totalSellValue || 0)).toFixed(2),
        ((settlementSummaryData?.clientSummary?.totals?.grossTradingPnL || 0) + (settlementSummaryData?.brokerSummary?.totals?.netTradingAmount || 0)).toFixed(2),
        '-',
        (settlementSummaryData?.reconciliation?.firmNetRealizedProfit || 0).toFixed(2),
        settlementSummaryData?.reconciliation?.isBalanced ? 'BALANCED' : 'IMBALANCE',
      ];

      return {
        title,
        subtitle,
        periodLabel: 'Settlement Period',
        asOfDate: settlementSummaryData?.settlement
          ? `${formatDateToDDMMYY(settlementSummaryData.settlement.fromDate)} - ${formatDateToDDMMYY(settlementSummaryData.settlement.toDate)}`
          : asOfDate,
        headers,
        alignments,
        groups,
        grandTotalRow,
        totalRows: clientRows.length + brokerRows.length,
      };
    }
  }, [reportType, groupBy, asOfDate, entityType, netPositionData, invoiceData, settlementDetailData, settlementSummaryData]);

  // Document Pages Partitioning (Real Paper Sheets)
  const documentPages = useMemo((): DocumentPageChunk[] => {
    const allGroups = reportConfig.groups;
    if (allGroups.length === 0) {
      return [
        {
          pageNumber: 1,
          title: reportConfig.title,
          groups: [],
          isFirstPage: true,
          isLastPage: true,
          rowCount: 0,
        },
      ];
    }

    const pages: DocumentPageChunk[] = [];
    let currentPageNumber = 1;
    let currentGroupsForPage: typeof allGroups = [];
    let currentRowsOnPage = 0;

    for (let gIndex = 0; gIndex < allGroups.length; gIndex++) {
      const group = allGroups[gIndex];
      const rows = group.rows;

      if (rows.length === 0) {
        currentGroupsForPage.push(group);
        continue;
      }

      let rowIndex = 0;
      while (rowIndex < rows.length) {
        const remainingSpace = ROWS_PER_PAGE - currentRowsOnPage;
        const sliceEnd = rowIndex + remainingSpace;
        const rowSlice = rows.slice(rowIndex, sliceEnd);
        const isLastSliceOfGroup = sliceEnd >= rows.length;

        currentGroupsForPage.push({
          groupTitle: rowIndex === 0 ? group.groupTitle : `${group.groupTitle} (Cont.)`,
          rows: rowSlice,
          subtotalRow: isLastSliceOfGroup ? group.subtotalRow : undefined,
        });

        currentRowsOnPage += rowSlice.length;
        rowIndex = sliceEnd;

        // If page is full or last group finished
        if (currentRowsOnPage >= ROWS_PER_PAGE || (gIndex === allGroups.length - 1 && isLastSliceOfGroup)) {
          pages.push({
            pageNumber: currentPageNumber,
            title: currentGroupsForPage[0]?.groupTitle || `Page ${currentPageNumber}`,
            groups: currentGroupsForPage,
            isFirstPage: currentPageNumber === 1,
            isLastPage: false,
            rowCount: currentRowsOnPage,
          });

          currentPageNumber++;
          currentGroupsForPage = [];
          currentRowsOnPage = 0;
        }
      }
    }

    // Flush any leftover rows
    if (currentGroupsForPage.length > 0) {
      pages.push({
        pageNumber: currentPageNumber,
        title: currentGroupsForPage[0]?.groupTitle || `Page ${currentPageNumber}`,
        groups: currentGroupsForPage,
        isFirstPage: currentPageNumber === 1,
        isLastPage: false,
        rowCount: currentRowsOnPage,
      });
    }

    if (pages.length > 0) {
      pages[pages.length - 1].isLastPage = true;
    }

    return pages;
  }, [reportConfig]);

  const totalDocumentPages = documentPages.length;

  // Handle jump to page
  const scrollToPage = (pageNum: number) => {
    setActivePage(pageNum);
    const element = document.getElementById(`doc-sheet-page-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Observe active page during vertical scroll
  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageIdStr = entry.target.id.replace('doc-sheet-page-', '');
            const pNum = parseInt(pageIdStr, 10);
            if (!isNaN(pNum)) {
              setActivePage(pNum);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.35,
      }
    );

    documentPages.forEach((p) => {
      const el = document.getElementById(`doc-sheet-page-${p.pageNumber}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [documentPages]);

  // Handle Export execute
  const handleExportExecute = (config: ExportConfig) => {
    setIsExporting(true);
    try {
      const exportOptions: PdfExportOptions = {
        orientation: config.orientation,
        includeKpis: false, // NO bulky KPI cards as requested!
        includeSubtotals: config.includeSubtotals,
        includeTotals: config.includeTotals,
        reportTitle: reportConfig.title,
        reportSubtitle: reportConfig.subtitle,
        periodLabel: reportConfig.periodLabel,
        asOfDate: reportConfig.asOfDate,
        filterSummary: [
          `Format: ${config.format.toUpperCase()}`,
          `Generated: ${formatDateToDDMMYY(new Date())}`,
        ],
        headers: reportConfig.headers,
        columnAlignments: reportConfig.alignments,
        groups: reportConfig.groups,
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

  // Close tab or back
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.opener) {
      window.close();
    } else {
      router.back();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0F172A] text-slate-100 font-body overflow-hidden antialiased select-none">
      {/* ─── 1. TOP DOCUMENT TOOLBAR (PDF READER CHROME) ───────────────────────── */}
      <header className="h-14 bg-[#1E293B] border-b border-slate-700/80 px-4 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Left: Back & Document Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/70 transition-colors cursor-pointer shrink-0"
            title="Return to application"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              'p-1.5 rounded-lg text-xs border transition-colors cursor-pointer shrink-0',
              isSidebarOpen
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-600/70'
            )}
            title={isSidebarOpen ? 'Hide Page Thumbnails' : 'Show Page Thumbnails'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-slate-700 shrink-0" />

          <div className="min-w-0">
            <h1 className="text-xs font-bold text-white truncate flex items-center gap-2">
              <span>{reportConfig.title}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PDF
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 truncate hidden md:block">
              {reportConfig.periodLabel}: {formatDateToDDMMYY(reportConfig.asOfDate)} · {reportConfig.totalRows} Records
            </p>
          </div>
        </div>

        {/* Center: Page Counter & Zoom Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Page Step Navigator */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => scrollToPage(Math.max(1, activePage - 1))}
              disabled={activePage <= 1}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 text-[11px] font-mono text-slate-300">
              Page <strong className="text-white font-bold">{activePage}</strong> / {totalDocumentPages}
            </span>

            <button
              type="button"
              onClick={() => scrollToPage(Math.min(totalDocumentPages, activePage + 1))}
              disabled={activePage >= totalDocumentPages}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block shrink-0" />

          {/* Zoom Level */}
          <div className="hidden sm:flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              disabled={zoomLevel <= 75}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="px-1.5 text-[11px] font-mono text-slate-300 min-w-[42px] text-center font-semibold">
              {zoomLevel}%
            </span>

            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              disabled={zoomLevel >= 130}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer border-l border-slate-800"
              title="Reset Zoom"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Right: Controls & Export Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Group By selector for Net Position */}
          {reportType === 'net-position' && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 text-[11px]">Group:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByDimension)}
                className="bg-transparent text-white font-semibold outline-hidden cursor-pointer text-xs"
              >
                <option value="CLIENT" className="bg-slate-900 text-white">Client</option>
                <option value="BROKER" className="bg-slate-900 text-white">Broker</option>
                <option value="SCRIPT" className="bg-slate-900 text-white">Script</option>
              </select>
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchReport}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600/70 transition-colors cursor-pointer"
            title="Reload report data"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-blue-400')} />
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/70 transition-colors cursor-pointer"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print</span>
          </button>

          {/* Direct Excel */}
          <button
            type="button"
            onClick={() => {
              downloadReportExcel({
                reportTitle: reportConfig.title,
                reportSubtitle: reportConfig.subtitle,
                periodLabel: reportConfig.periodLabel,
                asOfDate: reportConfig.asOfDate,
                headers: reportConfig.headers,
                columnAlignments: reportConfig.alignments,
                groups: reportConfig.groups,
                grandTotalRow: reportConfig.grandTotalRow,
              });
              toast.success('Excel spreadsheet downloaded!');
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600/70 transition-colors cursor-pointer"
            title="Download Excel Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>

          {/* Primary Download / Export Modal */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2652C8] hover:bg-blue-600 text-white shadow-sm transition-all cursor-pointer"
            title="Open Download / Export Options"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN VIEWER WORKSPACE: SIDEBAR + PAPER CANVAS ───────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Collapsible Page Thumbnails Sidebar */}
        {isSidebarOpen && (
          <aside className="w-64 bg-[#1E293B] border-r border-slate-700/80 flex flex-col shrink-0 z-20 print:hidden select-none transition-all duration-200">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-slate-700/80 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Page Thumbnails</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                {totalDocumentPages} pages
              </span>
            </div>

            {/* Thumbnail Cards Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {documentPages.map((page) => {
                const isSelected = activePage === page.pageNumber;

                return (
                  <div
                    key={page.pageNumber}
                    onClick={() => scrollToPage(page.pageNumber)}
                    className="group cursor-pointer flex flex-col items-center"
                  >
                    {/* Miniature Paper Sheet Preview */}
                    <div
                      className={cn(
                        'w-full aspect-[1.414/1] bg-white rounded-sm transition-all duration-150 p-2 relative overflow-hidden flex flex-col justify-between shadow-md',
                        isSelected
                          ? 'ring-2 ring-[#2652C8] shadow-blue-900/40 shadow-lg scale-[1.02]'
                          : 'opacity-70 group-hover:opacity-100 group-hover:scale-[1.01] border border-slate-600/50'
                      )}
                    >
                      {/* Top Header Mockup */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <div className="h-1.5 w-12 bg-slate-800 rounded-2xs" />
                        <div className="h-1 w-8 bg-slate-300 rounded-2xs" />
                      </div>

                      {/* Mockup Table Rows */}
                      <div className="space-y-1 my-1">
                        <div className="h-1.5 w-full bg-slate-200 rounded-2xs" />
                        <div className="h-1 w-5/6 bg-slate-100 rounded-2xs" />
                        <div className="h-1 w-full bg-slate-100 rounded-2xs" />
                        <div className="h-1 w-4/5 bg-slate-100 rounded-2xs" />
                        <div className="h-1 w-full bg-slate-100 rounded-2xs" />
                        <div className="h-1.5 w-3/4 bg-blue-100 rounded-2xs" />
                      </div>

                      {/* Bottom Footer Mockup */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                        <div className="h-1 w-10 bg-slate-200 rounded-2xs" />
                        <span className="text-[8px] font-mono font-bold text-slate-400">
                          {page.pageNumber}
                        </span>
                      </div>

                      {/* Active Page Badge Overlay */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 size-2 rounded-full bg-[#2652C8] ring-2 ring-white" />
                      )}
                    </div>

                    {/* Page Label & Title */}
                    <div className="mt-1.5 flex items-center justify-between w-full px-1 text-[11px]">
                      <span className={cn('font-mono font-bold', isSelected ? 'text-blue-400' : 'text-slate-400')}>
                        Page {page.pageNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={page.title}>
                        {page.title.replace(/^.*:\s*/, '')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Right: Document Reading Canvas with Stacked Paper Sheets */}
        <main
          ref={viewerContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0B1120] flex flex-col items-center print:bg-white print:p-0 print:overflow-visible"
        >
          {/* Zoom Wrapper */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="flex flex-col items-center space-y-8 print:space-y-0 print:transform-none w-full max-w-[1050px]"
          >
            {documentPages.map((page) => (
              <article
                key={page.pageNumber}
                id={`doc-sheet-page-${page.pageNumber}`}
                className={cn(
                  'w-full bg-white text-slate-900 shadow-2xl rounded-xs border border-slate-200/90 flex flex-col justify-between print:shadow-none print:border-none print:rounded-none print:w-full print:h-screen print:page-break-after-always',
                  'min-h-[740px] p-8 sm:p-12' // Landscape paper proportions
                )}
              >
                {/* ── Document Page Header ── */}
                <header className="border-b border-slate-200 pb-4 mb-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Brand & Title */}
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-[#0A1A4A] flex items-center justify-center text-white font-bold text-xs">
                          B
                        </div>
                        <div>
                          <div className="text-xs font-black tracking-wider text-[#0A1A4A] uppercase">
                            BIZZMATE FINANCIAL SYSTEMS
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                            Institutional Settlement & Reporting
                          </div>
                        </div>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 mt-2 tracking-tight">
                        {reportConfig.title}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {reportConfig.subtitle}
                      </p>
                    </div>

                    {/* Right: Date & Verification Stamp */}
                    <div className="text-right text-[11px] space-y-0.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shrink-0 font-sans">
                      <div>
                        <span className="text-slate-500">{reportConfig.periodLabel}:</span>{' '}
                        <strong className="text-slate-900 font-mono font-bold">
                          {formatDateToDDMMYY(reportConfig.asOfDate)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Generated:</span>{' '}
                        <span className="text-slate-700 font-mono">{formatDateToDDMMYY(new Date())}</span>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Ledger Record</span>
                      </div>
                    </div>
                  </div>
                </header>

                {/* ── Document Page Data Table ── */}
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-800 bg-[#0A1A4A] text-white">
                        {reportConfig.headers.map((h, hIdx) => {
                          const align = reportConfig.alignments[hIdx] || 'left';
                          return (
                            <th
                              key={hIdx}
                              className={cn(
                                'py-2 px-2.5 font-bold tracking-wider uppercase text-[10px]',
                                align === 'right' && 'text-right',
                                align === 'center' && 'text-center',
                                align === 'left' && 'text-left'
                              )}
                            >
                              {h}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {page.groups.map((group, grpIdx) => (
                        <React.Fragment key={grpIdx}>
                          {/* Section Group Header */}
                          {group.groupTitle && (
                            <tr className="bg-slate-100/90 font-bold border-y border-slate-300">
                              <td
                                colSpan={reportConfig.headers.length}
                                className="py-1.5 px-3 text-[11px] font-bold text-slate-800 uppercase tracking-wider"
                              >
                                {group.groupTitle}
                              </td>
                            </tr>
                          )}

                          {/* Data Rows */}
                          {group.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className="hover:bg-blue-50/50 transition-colors border-b border-slate-100"
                            >
                              {row.map((cell, cIdx) => {
                                const align = reportConfig.alignments[cIdx] || 'left';
                                const isNumeric = typeof cell === 'number' || (!isNaN(Number(cell)) && cell !== '-' && cell !== '');
                                const numVal = isNumeric ? Number(cell) : null;

                                return (
                                  <td
                                    key={cIdx}
                                    className={cn(
                                      'py-1.5 px-2.5',
                                      align === 'right' && 'text-right font-mono',
                                      align === 'center' && 'text-center font-mono',
                                      align === 'left' && 'text-left',
                                      numVal !== null && numVal < 0 && 'text-rose-700 font-semibold',
                                      numVal !== null && numVal > 0 && cIdx === row.length - 1 && 'text-emerald-700 font-semibold',
                                      cell === '-' && 'text-slate-300 text-center'
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
                            <tr className="bg-blue-50/70 font-bold border-t border-b border-blue-200">
                              {group.subtotalRow.map((cell, sIdx) => {
                                const align = reportConfig.alignments[sIdx] || 'left';
                                return (
                                  <td
                                    key={sIdx}
                                    className={cn(
                                      'py-1.5 px-2.5 text-slate-900 font-bold',
                                      align === 'right' && 'text-right font-mono',
                                      align === 'center' && 'text-center font-mono',
                                      align === 'left' && 'text-left font-semibold text-slate-800'
                                    )}
                                  >
                                    {cell}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </React.Fragment>
                      ))}

                      {/* Grand Total on Last Page */}
                      {page.isLastPage && reportConfig.grandTotalRow && (
                        <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-100 font-black">
                          {reportConfig.grandTotalRow.map((cell, gIdx) => {
                            const align = reportConfig.alignments[gIdx] || 'left';
                            return (
                              <td
                                key={gIdx}
                                className={cn(
                                  'py-2.5 px-2.5 text-slate-950 font-black text-xs',
                                  align === 'right' && 'text-right font-mono',
                                  align === 'center' && 'text-center font-mono',
                                  align === 'left' && 'text-left font-black tracking-wider uppercase'
                                )}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Document Page Footer ── */}
                <footer className="border-t border-slate-200 pt-3 mt-4 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                  <div>
                    Generated by <strong className="text-slate-600">BizzMate Accounting Systems</strong> · Verified Document
                  </div>
                  <div className="font-sans font-semibold text-slate-500 uppercase tracking-widest text-[9px]">
                    Strictly Confidential & Proprietary
                  </div>
                  <div className="font-bold text-slate-700">
                    Page {page.pageNumber} of {totalDocumentPages}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </main>
      </div>

      {/* ─── 3. PRE-DOWNLOAD EXPORT MODAL ────────────────────────────────────── */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportTitle={reportConfig.title}
        totalRowsCount={reportConfig.totalRows}
        currentPageRowsCount={reportConfig.totalRows}
        onConfirmExport={handleExportExecute}
        isExporting={isExporting}
      />
    </div>
  );
}
