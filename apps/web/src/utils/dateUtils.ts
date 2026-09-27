/**
 * Date utility functions for BizzMate Financial Accounting Software.
 */

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Auto-expands a 2-digit year to 4 digits (e.g., "26" -> "2026").
 * Validates that year is between 2000 and 2099.
 * Prevents invalid lengths like 5-digit years ("20206").
 */
export function normalizeYear(yearStr: string | number): number | null {
  const y = typeof yearStr === 'string' ? parseInt(yearStr.trim(), 10) : yearStr;
  if (isNaN(y)) return null;

  if (y >= 0 && y <= 99) {
    return 2000 + y;
  }
  if (y >= 2000 && y <= 2099) {
    return y;
  }
  return null;
}

/**
 * Formats a date string or Date object into "YYYY-MM-DD" for HTML date inputs.
 */
export function formatDateForInput(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const cleaned = String(dateVal).trim();
  if (!cleaned) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const yNorm = normalizeYear(dmyMatch[3]);
    if (yNorm) {
      return `${yNorm}-${m}-${d}`;
    }
  }

  // Handle YYYY/MM/DD
  const ymdSlash = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (ymdSlash) {
    return `${ymdSlash[1]}-${ymdSlash[2].padStart(2, '0')}-${ymdSlash[3].padStart(2, '0')}`;
  }

  // Handle DD-MMM-YY or DD-MMM-YYYY
  const mmmMatch = cleaned.match(/^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2,4})/);
  if (mmmMatch) {
    const d = mmmMatch[1].padStart(2, '0');
    const mStr = mmmMatch[2].toUpperCase();
    const mIdx = MONTH_NAMES.indexOf(mStr);
    const yNorm = normalizeYear(mmmMatch[3]);
    if (mIdx !== -1 && yNorm) {
      return `${yNorm}-${String(mIdx + 1).padStart(2, '0')}-${d}`;
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return '';
}

/**
 * Validates that an expiry date is not before the trade date.
 * Returns null if valid, or a human-friendly error string.
 */
export function validateExpiryAgainstTradeDate(
  tradeDateStr: string | Date | null | undefined,
  expiryDateStr: string | Date | null | undefined
): string | null {
  if (!tradeDateStr || !expiryDateStr) return null;

  const tNorm = formatDateForInput(tradeDateStr);
  const eNorm = formatDateForInput(expiryDateStr);

  if (!tNorm || !eNorm) return null;

  if (eNorm < tNorm) {
    return 'Expiry date cannot be before the trade date';
  }

  return null;
}

/**
 * Converts date or expiry into canonical human-readable "DD MMM YYYY" format
 * (e.g. "29 DEC 2026") used for security naming and display.
 */
export function formatDateToSecurityDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '';
  const inputNorm = formatDateForInput(dateVal);
  if (!inputNorm) return String(dateVal).trim().toUpperCase();

  const [y, m, d] = inputNorm.split('-');
  const mIdx = parseInt(m, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${d} ${MONTH_NAMES[mIdx]} ${y}`;
  }
  return inputNorm;
}
