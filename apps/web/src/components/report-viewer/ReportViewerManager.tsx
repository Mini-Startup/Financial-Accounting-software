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
  FileText,
  PanelLeftClose,
  PanelLeft,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '@/utils/apiClient';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { cn } from '@/utils/cn';
import { ExportModal, type ExportConfig } from './ExportModal';
import { downloadReportPdf, type PdfExportOptions, type PdfExportGroup } from '@/lib/pdf/reportPdfGenerator';
import { downloadReportExcel } from '@/lib/excel/reportExcelGenerator';
import type {
  NetPositionReportResponse,
  InvoiceReportResponse,
  SettlementDetailAuditResponse,
  SettlementSummaryReportResponse,
  GroupByDimension,
} from '@/components/reports/types';

interface GroupFinancialSummary {
  grossExposure: number;
  positiveExposure: number;
  negativeExposure: number;
  netQty: number;
  positiveQty: number;
  negativeQty: number;
  totalMtm: number;
  accountBalance: number;
  outstanding: number;
}

interface ViewerGroup {
  groupTitle?: string;
  rows: (string | number)[][];
  subtotalRow?: (string | number)[];
  summaryBox?: GroupFinancialSummary;
  summaryBoxLines?: string[];
}

interface DocumentPageChunk {
  pageNumber: number;
  title: string;
  groups: ViewerGroup[];
  isFirstPage: boolean;
  isLastPage: boolean;
  rowCount: number;
}

const ROWS_PER_PAGE = 18; // Portrait A4 natural ledger capacity per sheet

export function ReportViewerManager() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
  const initialType = searchParams.get('type') || 'net-position';
  const initialGroupBy = (searchParams.get('groupBy')?.toUpperCase() as GroupByDimension) || 'CLIENT';
  const initialAsOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];
  const initialEntityId = searchParams.get('entityId') || searchParams.get('accountId') || '';
  const initialEntityType = (searchParams.get('entityType')?.toUpperCase() as 'CLIENT' | 'BROKER') || 'CLIENT';
  const initialSettlementId = searchParams.get('settlementId') || '';
  const initialScriptId = searchParams.get('scriptId') || '';

  // Active state
  const [reportType] = useState<string>(initialType);
  const [groupBy, setGroupBy] = useState<GroupByDimension>(initialGroupBy);
  const [asOfDate] = useState<string>(initialAsOfDate);
  const [entityId] = useState<string>(initialEntityId);
  const [entityType] = useState<'CLIENT' | 'BROKER'>(initialEntityType);
  const [settlementId] = useState<string>(initialSettlementId);
  const [scriptId] = useState<string>(initialScriptId);

  // Viewer controls: Sidebar, Zoom, Active Page
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Loading & Data states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [netPositionData, setNetPositionData] = useState<NetPositionReportResponse | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceReportResponse | null>(null);
  const [settlementDetailData, setSettlementDetailData] = useState<SettlementDetailAuditResponse | null>(null);
  const [settlementSummaryData, setSettlementSummaryData] = useState<SettlementSummaryReportResponse | null>(null);

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Ref to container for scroll observation
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      if (reportType === 'net-position') {
        const params = new URLSearchParams();
        if (asOfDate) params.set('asOfDate', asOfDate);
        if (groupBy) params.set('groupBy', groupBy);
        if (entityId) params.set('entityId', entityId);
        if (entityType) params.set('entityType', entityType);

        const res = await apiFetch(`/reports/net-position?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setNetPositionData(data);
      } else if (reportType === 'invoice') {
        const params = new URLSearchParams();
        if (entityType) params.set('entityType', entityType);
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

  // Unified Report Configuration Model (Portrait Curated)
  const reportConfig = useMemo(() => {
    if (reportType === 'net-position') {
      const title = 'Net Position Report (Open Positions)';
      const subtitle = `Contract exposures and valuations aggregated by ${groupBy.toLowerCase()}`;

      if (groupBy === 'SCRIPT') {
        // Scrip-wise Net Position (Matching Image 1)
        const headers = ['Client Name', 'Code', 'Expiry Date', 'Net Qty', 'Average Strike', 'Net Lot'];
        const alignments: ('left' | 'center' | 'center' | 'right' | 'right' | 'right')[] = [
          'left',
          'center',
          'center',
          'right',
          'right',
          'right',
        ];

        const groups: ViewerGroup[] = [];
        let totalRows = 0;

        netPositionData?.groups?.forEach((g) => {
          const rows: (string | number)[][] = g.positions.map((p) => {
            const avgStrike = p.netAvgRate || (p.netQty >= 0 ? p.buyAvgRate : p.sellAvgRate) || 0;
            const netLotVal = g.lotSize && g.lotSize > 0 ? p.netQty / g.lotSize : p.netLot || 0;
            return [
              p.clientName || g.name,
              p.clientCode || g.code,
              p.expiryFormatted || '-',
              p.netQty,
              avgStrike ? avgStrike.toFixed(2) : '-',
              typeof netLotVal === 'number' ? netLotVal.toFixed(2) : String(netLotVal),
            ];
          });
          totalRows += rows.length;

          const totalNetLot = g.lotSize && g.lotSize > 0 ? (g.totals.netQty / g.lotSize).toFixed(2) : (g.totals.netLot || 0).toFixed(2);

          const subtotalRow: (string | number)[] = [
            `Total (${g.code})`,
            '-',
            '-',
            g.totals.netQty,
            '-',
            totalNetLot,
          ];

          groups.push({
            groupTitle: `Name : ${g.name}    LotSize: ${g.lotSize || 1}    Code : ${g.code}`,
            rows,
            subtotalRow,
          });
        });

        const grandTotalRow: (string | number)[] = [
          'GRAND TOTAL',
          '-',
          '-',
          netPositionData?.groups?.reduce((acc, g) => acc + g.totals.netQty, 0) || 0,
          '-',
          (netPositionData?.summary?.totalNotionalMarketValue || 0).toFixed(2),
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
      } else {
        // Client-wise Net Position / M-to-M (Matching Image 3 & 4)
        const headers = ['Script', 'Expiry', 'Net Qty', 'Avg Strike', 'Closing Rate', 'Amount M-to-M'];
        const alignments: ('left' | 'center' | 'right' | 'right' | 'right' | 'right')[] = [
          'left',
          'center',
          'right',
          'right',
          'right',
          'right',
        ];

        const groups: ViewerGroup[] = [];
        let totalRows = 0;

        netPositionData?.groups?.forEach((g) => {
          let posExpo = 0;
          let negExpo = 0;
          let posQ = 0;
          let negQ = 0;

          const rows: (string | number)[][] = g.positions.map((p) => {
            const avgStrike = p.netAvgRate || (p.netQty >= 0 ? p.buyAvgRate : p.sellAvgRate) || 0;
            const closing = p.closingRate || 0;
            const exposureVal = Math.abs(p.netQty * (closing || avgStrike));

            if (p.netQty >= 0) {
              posExpo += exposureVal;
              posQ += p.netQty;
            } else {
              negExpo += exposureVal;
              negQ += p.netQty;
            }

            return [
              p.securityName || p.scriptShortName,
              p.expiryFormatted || '-',
              p.netQty,
              avgStrike ? avgStrike.toFixed(2) : '-',
              closing ? closing.toFixed(2) : '-',
              p.unrealizedPnL.toFixed(2),
            ];
          });
          totalRows += rows.length;

          const grossExpo = posExpo + negExpo;
          const totalMtm = g.totals.unrealizedPnL;

          const summaryBox: GroupFinancialSummary = {
            grossExposure: grossExpo,
            positiveExposure: posExpo,
            negativeExposure: negExpo,
            netQty: g.totals.netQty,
            positiveQty: posQ,
            negativeQty: negQ,
            totalMtm,
            accountBalance: 0,
            outstanding: totalMtm,
          };

          const mtmSign = totalMtm >= 0 ? 'Cr.' : 'Dr.';
          const outSign = totalMtm >= 0 ? 'Cr.' : 'Dr.';

          const summaryBoxLines = [
            `Exposure: ${grossExpo.toFixed(2)}    + Expo.: ${posExpo.toFixed(2)}    - Expo.: ${negExpo.toFixed(2)}`,
            `NetQ: ${g.totals.netQty}    + Q: ${posQ}    - Q: ${negQ}`,
            `Total M-to-M: ${mtmSign} ${Math.abs(totalMtm).toFixed(2)}    A/c Balance: 0.00    Outstanding: ${outSign} ${Math.abs(totalMtm).toFixed(2)}`,
          ];

          const subtotalRow: (string | number)[] = [
            `Total (${g.code})`,
            '-',
            g.totals.netQty,
            '-',
            '-',
            g.totals.unrealizedPnL.toFixed(2),
          ];

          groups.push({
            groupTitle: `Name : ${g.name}    Code : ${g.code}`,
            rows,
            subtotalRow,
            summaryBox,
            summaryBoxLines,
          });
        });

        const grandTotalRow: (string | number)[] = [
          'GRAND TOTAL',
          '-',
          netPositionData?.groups?.reduce((acc, g) => acc + g.totals.netQty, 0) || 0,
          '-',
          '-',
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
      }
    } else if (reportType === 'invoice') {
      const title = 'Client & Broker Invoice Statement';
      const subtitle = `Settlement contract billing statement for ${entityType.toLowerCase()}s`;
      const headers = ['Security / Script', 'Buy Qty', 'Sell Qty', 'Net Bill Amount (₹)'];
      const alignments: ('left' | 'right' | 'right' | 'right')[] = ['left', 'right', 'right', 'right'];

      const groups: ViewerGroup[] = [];
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
      const headers = ['Date', 'Trade No', 'Type', 'Security', 'Qty', 'Price', 'Settlement Rate', 'PnL (₹)'];
      const alignments: ('center' | 'center' | 'center' | 'left' | 'right' | 'right' | 'right' | 'right')[] = [
        'center',
        'center',
        'center',
        'left',
        'right',
        'right',
        'right',
        'right',
      ];

      const groups: ViewerGroup[] = [];
      let totalRows = 0;

      settlementDetailData?.clientAuditGroups?.forEach((g) => {
        const rows: (string | number)[][] = (g.trades || []).map((t) => [
          formatDateToDDMMYY(t.tradeDate),
          t.tradeNumber || '-',
          t.tradeType || '-',
          t.securityName,
          t.quantity,
          t.rate.toFixed(2),
          t.settlementRate ? t.settlementRate.toFixed(2) : '-',
          t.pnl.toFixed(2),
        ]);
        totalRows += rows.length;

        const subtotalRow: (string | number)[] = [
          `Subtotal (${g.clientName})`,
          '-',
          '-',
          '-',
          g.subtotals.buyQty + g.subtotals.sellQty,
          '-',
          '-',
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
        settlementDetailData?.metrics?.totalTradedUnits || 0,
        '-',
        '-',
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
      // Settlement Summary (Matching Image 2 - Futures Settlement Clearing Sheet)
      const title = 'Financial Settlement Summary Sheet';
      const subtitle = `Consolidated counterparty settlement clearing for ${settlementSummaryData?.settlement?.name || 'Cycle'}`;
      const headers = ['Account Name', 'Code', 'Gross PnL (₹)', 'Brokerage (₹)', 'Debit (₹)', 'Credit (₹)'];
      const alignments: ('left' | 'center' | 'right' | 'right' | 'right' | 'right')[] = [
        'left',
        'center',
        'right',
        'right',
        'right',
        'right',
      ];

      let totalDebit = 0;
      let totalCredit = 0;

      const clientRows: (string | number)[][] =
        settlementSummaryData?.clientSummary?.rows?.map((r) => {
          const isDebit = r.type === 'Dr';
          const debitVal = isDebit ? r.netAmount : 0;
          const creditVal = !isDebit ? r.netAmount : 0;
          totalDebit += debitVal;
          totalCredit += creditVal;

          return [
            r.accountName,
            r.accountCode,
            r.grossPnL.toFixed(2),
            r.brokerage.toFixed(2),
            isDebit ? r.netAmount.toFixed(2) : '-',
            !isDebit ? r.netAmount.toFixed(2) : '-',
          ];
        }) || [];

      const brokerRows: (string | number)[][] =
        settlementSummaryData?.brokerSummary?.rows?.map((r) => {
          const isDebit = r.type === 'Dr';
          const debitVal = isDebit ? r.netAmount : 0;
          const creditVal = !isDebit ? r.netAmount : 0;
          totalDebit += debitVal;
          totalCredit += creditVal;

          return [
            r.brokerName,
            r.brokerCode,
            r.netTradingAmount.toFixed(2),
            r.charges.toFixed(2),
            isDebit ? r.netAmount.toFixed(2) : '-',
            !isDebit ? r.netAmount.toFixed(2) : '-',
          ];
        }) || [];

      const groups: ViewerGroup[] = [
        {
          groupTitle: `Client Settlement Accounts (${clientRows.length})`,
          rows: clientRows,
          subtotalRow: [
            'Total Clients',
            '-',
            (settlementSummaryData?.clientSummary?.totals?.grossTradingPnL || 0).toFixed(2),
            (settlementSummaryData?.clientSummary?.totals?.totalBrokerage || 0).toFixed(2),
            (settlementSummaryData?.clientSummary?.totals?.netPayable || 0).toFixed(2),
            (settlementSummaryData?.clientSummary?.totals?.netReceivable || 0).toFixed(2),
          ],
        },
        {
          groupTitle: `Broker Clearing Accounts (${brokerRows.length})`,
          rows: brokerRows,
          subtotalRow: [
            'Total Brokers',
            '-',
            (settlementSummaryData?.brokerSummary?.totals?.netTradingAmount || 0).toFixed(2),
            (settlementSummaryData?.brokerSummary?.totals?.totalCharges || 0).toFixed(2),
            (settlementSummaryData?.brokerSummary?.totals?.netPayable || 0).toFixed(2),
            (settlementSummaryData?.brokerSummary?.totals?.netReceivable || 0).toFixed(2),
          ],
        },
      ];

      const grandTotalRow: (string | number)[] = [
        'BALANCED SETTLEMENT TOTAL',
        '-',
        '-',
        '-',
        totalDebit.toFixed(2),
        totalCredit.toFixed(2),
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

  // Document Pages Partitioning (Portrait Sheets)
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
    let currentGroupsForPage: ViewerGroup[] = [];
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
          summaryBox: isLastSliceOfGroup ? group.summaryBox : undefined,
          summaryBoxLines: isLastSliceOfGroup ? group.summaryBoxLines : undefined,
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

    const handleScroll = () => {
      const sheets = documentPages.map((p) => ({
        pageNum: p.pageNumber,
        el: document.getElementById(`doc-sheet-page-${p.pageNumber}`),
      }));

      const scrollPos = container.scrollTop + 140;

      for (let i = sheets.length - 1; i >= 0; i--) {
        const item = sheets[i];
        if (item.el && item.el.offsetTop <= scrollPos) {
          setActivePage(item.pageNum);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [documentPages]);

  // Execute export with Portrait default
  const handleExportExecute = (config: ExportConfig) => {
    setIsExporting(true);
    try {
      const exportOptions: PdfExportOptions = {
        orientation: config.orientation || 'portrait',
        includeKpis: false,
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
        groups: reportConfig.groups as PdfExportGroup[],
        grandTotalRow: reportConfig.grandTotalRow,
      };

      if (config.format === 'pdf') {
        downloadReportPdf(exportOptions);
        toast.success('Portrait PDF Document generated and downloaded successfully!');
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
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-800 font-body overflow-hidden antialiased select-none">
      {/* ─── 1. TOP DOCUMENT TOOLBAR (LIGHT / WHITE MODE CHROME) ─────────────── */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
        {/* Left: Back & Document Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Return to application"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              'p-1.5 rounded-lg text-xs border transition-colors cursor-pointer shrink-0',
              isSidebarOpen
                ? 'bg-blue-50 text-[#1D4ED8] border-blue-200'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
            )}
            title={isSidebarOpen ? 'Hide Page Thumbnails' : 'Show Page Thumbnails'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 truncate flex items-center gap-2">
              <span>{reportConfig.title}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200/80">
                PORTRAIT
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 truncate hidden md:block">
              {reportConfig.periodLabel}: {formatDateToDDMMYY(reportConfig.asOfDate)} · {reportConfig.totalRows} Records
            </p>
          </div>
        </div>

        {/* Center: Page Counter & Zoom Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Page Step Navigator */}
          <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => scrollToPage(Math.max(1, activePage - 1))}
              disabled={activePage <= 1}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 text-[11px] font-mono text-slate-600">
              Page <strong className="text-slate-900 font-bold">{activePage}</strong> / {totalDocumentPages}
            </span>

            <button
              type="button"
              onClick={() => scrollToPage(Math.min(totalDocumentPages, activePage + 1))}
              disabled={activePage >= totalDocumentPages}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Zoom Level */}
          <div className="hidden sm:flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              disabled={zoomLevel <= 75}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="px-1.5 text-[11px] font-mono text-slate-700 min-w-[42px] text-center font-semibold">
              {zoomLevel}%
            </span>

            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              disabled={zoomLevel >= 130}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer border-l border-slate-200"
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
            <div className="hidden lg:flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-500 text-[11px] font-medium">Group:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByDimension)}
                className="bg-transparent text-slate-800 font-semibold outline-hidden cursor-pointer text-xs"
              >
                <option value="CLIENT">Client</option>
                <option value="BROKER">Broker</option>
                <option value="SCRIPT">Script</option>
              </select>
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchReport}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="Reload report data"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-[#1D4ED8]')} />
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
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
                groups: reportConfig.groups as PdfExportGroup[],
                grandTotalRow: reportConfig.grandTotalRow,
              });
              toast.success('Excel spreadsheet downloaded!');
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
            title="Download Excel Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          {/* Primary Download / Export Modal */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0A1A4A] hover:bg-[#102E7A] text-white shadow-sm transition-all cursor-pointer"
            title="Open Download / Export Options"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN VIEWER WORKSPACE: SIDEBAR + PAPER CANVAS ───────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Collapsible Page Thumbnails Sidebar (Light Mode) */}
        {isSidebarOpen && (
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 print:hidden select-none transition-all duration-200 shadow-2xs">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Page Thumbnails</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
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
                    {/* Miniature Portrait Paper Sheet Preview */}
                    <div
                      className={cn(
                        'w-36 aspect-[1/1.414] bg-white rounded-md transition-all duration-150 p-2 relative overflow-hidden flex flex-col justify-between shadow-xs border',
                        isSelected
                          ? 'ring-2 ring-[#2652C8] border-blue-600 bg-blue-50/20 shadow-md scale-[1.02]'
                          : 'border-slate-200 opacity-80 group-hover:opacity-100 group-hover:border-slate-300 group-hover:scale-[1.01]'
                      )}
                    >
                      {/* Top Header Mockup */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <div className="h-1.5 w-12 bg-slate-800 rounded-2xs" />
                        <div className="h-1 w-6 bg-blue-600 rounded-2xs" />
                      </div>

                      {/* Mockup Table Rows */}
                      <div className="space-y-1 my-1">
                        <div className="h-1.5 w-full bg-[#0A1A4A] rounded-2xs opacity-80" />
                        <div className="h-1 w-full bg-slate-200 rounded-2xs" />
                        <div className="h-1 w-5/6 bg-slate-100 rounded-2xs" />
                        <div className="h-1 w-full bg-slate-100 rounded-2xs" />
                        <div className="h-1 w-4/5 bg-slate-100 rounded-2xs" />
                        <div className="h-1 w-full bg-slate-100 rounded-2xs" />
                        <div className="h-1.5 w-full bg-blue-100 rounded-2xs" />
                      </div>

                      {/* Bottom Footer Mockup */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                        <div className="h-1 w-8 bg-slate-300 rounded-2xs" />
                        <span className="text-[8px] font-mono font-bold text-slate-500">
                          {page.pageNumber}
                        </span>
                      </div>

                      {/* Active Page Badge Overlay */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#2652C8] ring-2 ring-white" />
                      )}
                    </div>

                    {/* Page Label & Title */}
                    <div className="mt-1.5 flex items-center justify-between w-full px-2 text-[11px]">
                      <span className={cn('font-mono font-bold', isSelected ? 'text-[#1D4ED8]' : 'text-slate-600')}>
                        Page {page.pageNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={page.title}>
                        {page.title.replace(/^.*:\s*/, '')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Right: Document Reading Canvas with Stacked Portrait Paper Sheets */}
        <main
          ref={viewerContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 flex flex-col items-center print:bg-white print:p-0 print:overflow-visible"
        >
          {/* Zoom Wrapper */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="flex flex-col items-center space-y-8 print:space-y-0 print:transform-none w-full max-w-[794px]"
          >
            {documentPages.map((page) => (
              <article
                key={page.pageNumber}
                id={`doc-sheet-page-${page.pageNumber}`}
                className={cn(
                  'w-full bg-white text-slate-900 shadow-md rounded-2xl border border-slate-200/90 flex flex-col justify-between print:shadow-none print:border-none print:rounded-none print:w-full print:h-screen print:page-break-after-always',
                  'min-h-[1123px] p-8 sm:p-10' // Standard A4 Portrait Proportions
                )}
              >
                <div>
                  {/* ── Document Page Header ── */}
                  <header className="border-b border-slate-200 pb-4 mb-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Brand & Title */}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-md bg-[#0A1A4A] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                            B
                          </div>
                          <div>
                            <div className="text-xs font-black tracking-wider text-[#0A1A4A] uppercase">
                              BIZZMATE FINANCIAL SYSTEMS
                            </div>
                            <div className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                              Institutional Accounting & Settlement Engine
                            </div>
                          </div>
                        </div>

                        <h2 className="text-base font-bold text-slate-900 mt-2 tracking-tight">
                          {reportConfig.title}
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {reportConfig.subtitle}
                        </p>
                      </div>

                      {/* Right: Date & Verification Stamp */}
                      <div className="text-right text-[11px] space-y-0.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shrink-0 font-sans shadow-2xs">
                        <div>
                          <span className="text-slate-500">{reportConfig.periodLabel}:</span>{' '}
                          <strong className="text-slate-900 font-mono font-bold whitespace-nowrap">
                            {formatDateToDDMMYY(reportConfig.asOfDate)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Generated:</span>{' '}
                          <span className="text-slate-700 font-mono whitespace-nowrap">{formatDateToDDMMYY(new Date())}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Audited Ledger</span>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* ── Document Page Data Table ── */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs mb-4">
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-[#0A1A4A] text-white">
                          {reportConfig.headers.map((h, hIdx) => {
                            const align = reportConfig.alignments[hIdx] || 'left';
                            return (
                              <th
                                key={hIdx}
                                className={cn(
                                  'py-2 px-3 font-bold tracking-wider uppercase text-[10px] whitespace-nowrap',
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
                              <tr className="bg-slate-50/90 font-bold border-y border-slate-200">
                                <td
                                  colSpan={reportConfig.headers.length}
                                  className="py-1.5 px-3 text-[11px] font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap"
                                >
                                  {group.groupTitle}
                                </td>
                              </tr>
                            )}

                            {/* Data Rows */}
                            {group.rows.map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className="hover:bg-blue-50/40 transition-colors border-b border-slate-100"
                              >
                                {row.map((cell, cIdx) => {
                                  const align = reportConfig.alignments[cIdx] || 'left';
                                  const isNumeric = typeof cell === 'number' || (!isNaN(Number(cell)) && cell !== '-' && cell !== '');
                                  const numVal = isNumeric ? Number(cell) : null;

                                  return (
                                    <td
                                      key={cIdx}
                                      className={cn(
                                        'py-1.5 px-3 whitespace-nowrap',
                                        align === 'right' && 'text-right font-mono',
                                        align === 'center' && 'text-center font-mono',
                                        align === 'left' && 'text-left',
                                        numVal !== null && numVal < 0 && 'text-rose-600 font-semibold',
                                        numVal !== null && numVal > 0 && cIdx === row.length - 1 && 'text-emerald-600 font-semibold',
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
                              <tr className="bg-slate-100/80 font-bold border-t border-b border-slate-200">
                                {group.subtotalRow.map((cell, sIdx) => {
                                  const align = reportConfig.alignments[sIdx] || 'left';
                                  return (
                                    <td
                                      key={sIdx}
                                      className={cn(
                                        'py-1.5 px-3 text-slate-900 font-bold whitespace-nowrap',
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
                          <tr className="border-t-2 border-slate-900 bg-[#0A1A4A] text-white font-black">
                            {reportConfig.grandTotalRow.map((cell, gIdx) => {
                              const align = reportConfig.alignments[gIdx] || 'left';
                              return (
                                <td
                                  key={gIdx}
                                  className={cn(
                                    'py-2 px-3 font-black text-xs whitespace-nowrap',
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

                  {/* ── Financial Exposure Summary Cards (Matching Image 3 & 4) ── */}
                  {page.groups.some((g) => g.summaryBox) && (
                    <div className="space-y-3 mb-4">
                      {page.groups.map(
                        (g, gIdx) =>
                          g.summaryBox && (
                            <div
                              key={gIdx}
                              className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5 shadow-2xs font-mono"
                            >
                              <div className="flex items-center justify-between text-slate-700 font-semibold border-b border-slate-200/80 pb-1">
                                <span>
                                  Exposure: <strong className="text-slate-900">{g.summaryBox.grossExposure.toFixed(2)}</strong>
                                </span>
                                <span>
                                  + Expo: <strong className="text-emerald-700">{g.summaryBox.positiveExposure.toFixed(2)}</strong>
                                </span>
                                <span>
                                  - Expo: <strong className="text-rose-700">{g.summaryBox.negativeExposure.toFixed(2)}</strong>
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600">
                                <span>
                                  NetQ: <strong className="text-slate-900">{g.summaryBox.netQty}</strong>
                                </span>
                                <span>
                                  + Q: <strong className="text-emerald-700">{g.summaryBox.positiveQty}</strong>
                                </span>
                                <span>
                                  - Q: <strong className="text-rose-700">{g.summaryBox.negativeQty}</strong>
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 font-bold">
                                <span>
                                  Total M-to-M:{' '}
                                  <span className={cn(g.summaryBox.totalMtm >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                                    {g.summaryBox.totalMtm >= 0 ? 'Cr.' : 'Dr.'} {Math.abs(g.summaryBox.totalMtm).toFixed(2)}
                                  </span>
                                </span>
                                <span>A/c Balance: Dr. 0.00</span>
                                <span className={cn(g.summaryBox.outstanding >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                                  Outstanding: {g.summaryBox.outstanding >= 0 ? 'Cr.' : 'Dr.'} {Math.abs(g.summaryBox.outstanding).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )
                      )}
                    </div>
                  )}
                </div>

                {/* ── Document Page Footer ── */}
                <footer className="border-t border-slate-200 pt-3 mt-4 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                  <div>
                    Generated by <strong className="text-slate-700">BizzMate Accounting Systems</strong> · Audited Document
                  </div>
                  <div className="font-sans font-semibold text-slate-400 uppercase tracking-widest text-[9px]">
                    Strictly Confidential
                  </div>
                  <div className="font-bold text-slate-800">
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
