import { formatDateToDDMMYY } from '../../utils/dateUtils';

/**
 * Escapes a cell value according to RFC 4180:
 * Wraps values with commas, quotes, or newlines in double quotes,
 * and escapes double quotes by doubling them ("").
 */
export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';

  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a 2D array of rows into an RFC 4180 compliant CSV string
 * prefixed with the UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility.
 */
export function generateCsvString(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return `\uFEFF${[headerLine, ...rowLines].join('\r\n')}`;
}

/**
 * Triggers a browser file download of a generated CSV string.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a clean export filename containing the date in DD-MM-YY format.
 */
export function formatExportFilename(baseName: string, suffix?: string): string {
  const dateStr = formatDateToDDMMYY(new Date()).replace(/[/\\:]/g, '-');
  const sanitizedBase = baseName.trim().replace(/\s+/g, '_');
  const sanitizedSuffix = suffix ? `_${suffix.trim().replace(/\s+/g, '_')}` : '';
  return `${sanitizedBase}${sanitizedSuffix}_${dateStr}.csv`;
}

/**
 * Triggers native browser print dialog with print media layout.
 */
export function triggerPrint(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
