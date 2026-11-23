import * as XLSX from 'xlsx';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import type { PdfExportOptions } from '../pdf/reportPdfGenerator';

export function downloadReportExcel(options: PdfExportOptions): void {
  const wb = XLSX.utils.book_new();

  const sheetData: (string | number)[][] = [];

  // 1. Report Header Block
  sheetData.push(['BIZZMATE FINANCIAL SYSTEMS']);
  sheetData.push([options.reportTitle.toUpperCase()]);
  sheetData.push([options.reportSubtitle]);
  const asOf = options.asOfDate ? formatDateToDDMMYY(options.asOfDate) : formatDateToDDMMYY(new Date());
  sheetData.push([`${options.periodLabel || 'Period / As of Date'}: ${asOf}`]);
  const now = new Date();
  sheetData.push([`Exported On: ${formatDateToDDMMYY(now)} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`]);
  if (options.filterSummary && options.filterSummary.length > 0) {
    sheetData.push([`Filters: ${options.filterSummary.join(' | ')}`]);
  }
  sheetData.push([]); // Empty spacer row

  // 2. KPIs Summary (if included)
  if (options.includeKpis !== false && options.kpis && options.kpis.length > 0) {
    sheetData.push(['EXECUTIVE SUMMARY']);
    const kpiLabels = options.kpis.map((k) => k.label);
    const kpiValues = options.kpis.map((k) => k.value);
    sheetData.push(kpiLabels);
    sheetData.push(kpiValues);
    sheetData.push([]); // Spacer
  }

  // 3. Table Column Headers
  sheetData.push(options.headers);

  // 4. Groups & Data
  options.groups.forEach((group) => {
    if (group.groupTitle) {
      sheetData.push([`>> ${group.groupTitle}`]);
    }

    group.rows.forEach((row) => {
      sheetData.push(row);
    });

    if (options.includeSubtotals !== false && group.subtotalRow) {
      sheetData.push(group.subtotalRow);
    }
  });

  // 5. Grand Total Row
  if (options.includeTotals !== false && options.grandTotalRow) {
    sheetData.push([]);
    sheetData.push(options.grandTotalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto-calculate column widths
  const colWidths = options.headers.map((h, i) => {
    let maxLen = h.length;
    options.groups.forEach((g) => {
      g.rows.forEach((r) => {
        const val = r[i];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      });
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });

  ws['!cols'] = colWidths;

  const safeTitle = options.reportTitle.trim().replace(/\s+/g, '_').substring(0, 25);
  XLSX.utils.book_append_sheet(wb, ws, safeTitle || 'Report');

  const dateStr = formatDateToDDMMYY(new Date()).replace(/[/\\:]/g, '-');
  const filename = options.filename || `BizzMate_${safeTitle}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}
