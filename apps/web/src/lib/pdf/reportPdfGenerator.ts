import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

export interface PdfExportKpi {
  label: string;
  value: string;
  color?: 'default' | 'green' | 'red';
}

export interface PdfExportGroup {
  groupTitle?: string;
  rows: (string | number)[][];
  subtotalRow?: (string | number)[];
}

export interface PdfExportOptions {
  orientation?: 'landscape' | 'portrait';
  includeKpis?: boolean;
  includeSubtotals?: boolean;
  includeTotals?: boolean;
  reportTitle: string;
  reportSubtitle: string;
  periodLabel?: string;
  asOfDate?: string;
  filterSummary?: string[];
  kpis?: PdfExportKpi[];
  headers: string[];
  columnAlignments?: ('left' | 'center' | 'right')[];
  groups: PdfExportGroup[];
  grandTotalRow?: (string | number)[];
  filename?: string;
}

export function generateReportPdf(options: PdfExportOptions): jsPDF {
  const orientation = options.orientation || 'landscape';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;

  // 1. BRAND TOP ACCENT BAR
  doc.setFillColor(29, 78, 216); // #1D4ED8 (Brand Blue)
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. DOCUMENT HEADER
  let currentY = 28;

  // Brand Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(10, 26, 74); // #0A1A4A
  doc.text('BIZZMATE FINANCIAL SYSTEMS', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // #64748B
  doc.text('INSTITUTIONAL ACCOUNTING & SETTLEMENT ENGINE', margin, currentY + 11);

  // Report Title (Right or Below)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text(options.reportTitle.toUpperCase(), margin, currentY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(options.reportSubtitle, margin, currentY + 42);

  // Metadata Box on Right Side
  const metaRightX = pageWidth - margin;
  const asOf = options.asOfDate ? formatDateToDDMMYY(options.asOfDate) : formatDateToDDMMYY(new Date());
  const now = new Date();
  const printTimestamp = `${formatDateToDDMMYY(now)} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(10, 26, 74);
  doc.text(`${options.periodLabel || 'Period / As of'}:`, metaRightX - 160, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(asOf, metaRightX, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Generated On:', metaRightX - 160, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(printTimestamp, metaRightX, currentY + 12, { align: 'right' });

  if (options.filterSummary && options.filterSummary.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Scope / Filters:', metaRightX - 160, currentY + 24);
    doc.setFont('helvetica', 'normal');
    doc.text(options.filterSummary.slice(0, 2).join(' | '), metaRightX, currentY + 24, { align: 'right' });
  }

  currentY += 56;

  // 3. OPTIONAL KPI CARDS
  if (options.includeKpis !== false && options.kpis && options.kpis.length > 0) {
    const kpiCount = options.kpis.length;
    const cardGap = 10;
    const totalGap = cardGap * (kpiCount - 1);
    const usableWidth = pageWidth - margin * 2;
    const cardWidth = (usableWidth - totalGap) / kpiCount;
    const cardHeight = 36;

    options.kpis.forEach((kpi, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);

      // Card Background & Border
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 4, 4, 'FD');

      // Top color indicator strip
      let stripColor = [29, 78, 216]; // Brand blue default
      if (kpi.color === 'green') stripColor = [22, 163, 74];
      if (kpi.color === 'red') stripColor = [220, 38, 38];

      doc.setFillColor(stripColor[0], stripColor[1], stripColor[2]);
      doc.roundedRect(cardX, currentY, cardWidth, 2.5, 2, 2, 'F');

      // KPI Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label.toUpperCase(), cardX + 8, currentY + 13);

      // KPI Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      if (kpi.color === 'green') doc.setTextColor(22, 163, 74);
      else if (kpi.color === 'red') doc.setTextColor(220, 38, 38);
      else doc.setTextColor(15, 23, 42);

      doc.text(kpi.value, cardX + 8, currentY + 28);
    });

    currentY += cardHeight + 14;
  }

  // 4. BUILD TABLE BODY WITH GROUPS, SUBTOTALS & GRAND TOTAL
  const colCount = options.headers.length;
  const tableBody: any[][] = [];

  options.groups.forEach((group) => {
    // Group Header Row
    if (group.groupTitle) {
      tableBody.push([
        {
          content: group.groupTitle,
          colSpan: colCount,
          styles: {
            fillColor: [224, 231, 255], // indigo-100
            textColor: [30, 58, 138], // indigo-900
            fontStyle: 'bold',
            halign: 'left',
          },
        },
      ]);
    }

    // Detail Rows
    group.rows.forEach((row, rowIdx) => {
      tableBody.push(
        row.map((cell, cIdx) => ({
          content: String(cell ?? ''),
          styles: {
            halign: options.columnAlignments?.[cIdx] || 'left',
            fillColor: rowIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 252],
          },
        }))
      );
    });

    // Subtotal Row
    if (options.includeSubtotals !== false && group.subtotalRow) {
      tableBody.push(
        group.subtotalRow.map((cell, cIdx) => ({
          content: String(cell ?? ''),
          styles: {
            halign: options.columnAlignments?.[cIdx] || 'left',
            fillColor: [241, 245, 249], // slate-100
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: { top: 0.75, bottom: 0.75 },
            lineColor: [203, 213, 225],
          },
        }))
      );
    }
  });

  // Grand Total Row
  if (options.includeTotals !== false && options.grandTotalRow) {
    tableBody.push(
      options.grandTotalRow.map((cell, cIdx) => ({
        content: String(cell ?? ''),
        styles: {
          halign: options.columnAlignments?.[cIdx] || 'left',
          fillColor: [10, 26, 74], // Deep Navy
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          lineWidth: { top: 1.5, bottom: 1.5 },
          lineColor: [29, 78, 216],
        },
      }))
    );
  }

  // 5. RENDER AUTOTABLE
  autoTable(doc, {
    head: [options.headers],
    body: tableBody,
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 32 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 4,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [10, 26, 74], // #0A1A4A Deep Navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      cellPadding: 5,
    },
    didDrawPage: (data) => {
      // Running Footer
      const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
      const currentPage = data.pageNumber;
      const footerY = pageHeight - 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        'Confidential — Generated by BizzMate Accounting System. For internal auditing & authorized use only.',
        margin,
        footerY
      );

      doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
    },
  });

  return doc;
}

export function downloadReportPdf(options: PdfExportOptions): void {
  const doc = generateReportPdf(options);
  const dateStr = formatDateToDDMMYY(new Date()).replace(/[/\\:]/g, '-');
  const safeTitle = options.reportTitle.trim().replace(/\s+/g, '_');
  const filename = options.filename || `BizzMate_${safeTitle}_${dateStr}.pdf`;
  doc.save(filename);
}
