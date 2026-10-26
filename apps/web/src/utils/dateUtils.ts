/**
 * Date utility functions for BizzMate Financial Accounting Software.
 */

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Auto-expands a 2-digit year to 4 digits (e.g., "26" -> 2026).
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
 * Strictly verifies whether year, month, and day constitute a real, valid calendar date.
 * Prevents month overflow (e.g. month 54) and invalid day numbers (e.g. Feb 30, April 31).
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1900 || year > 2099) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  iso?: string;
  year?: number;
  month?: number;
  day?: number;
}

/**
 * Parses any date format and performs rigorous validation.
 * Returns human-friendly error messages if invalid.
 */
export function parseDateDetailed(dateVal: string | number | Date | null | undefined): DateValidationResult {
  if (dateVal === null || dateVal === undefined || dateVal === '') {
    return { isValid: false, error: 'Date is required' };
  }

  if (typeof dateVal === 'number' || dateVal instanceof Date) {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return { isValid: false, error: 'Invalid date format' };
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    if (!isValidCalendarDate(y, m, day)) return { isValid: false, error: 'Invalid calendar date' };
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { isValid: true, iso, year: y, month: m, day };
  }

  const raw = String(dateVal).trim();
  if (!raw) return { isValid: false, error: 'Date is required' };

  // Check for separator-based input: DD-MM-YY, DD-MM-YYYY, DD/MM/YY, DD/MM/YYYY, etc.
  const dmyMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const yNorm = normalizeYear(dmyMatch[3]);

    if (m < 1 || m > 12) {
      return { isValid: false, error: 'Month must be between 01 and 12' };
    }
    if (d < 1 || d > 31) {
      return { isValid: false, error: 'Day must be between 01 and 31' };
    }
    if (!yNorm) {
      return { isValid: false, error: 'Year must be between 2000 and 2099' };
    }
    if (!isValidCalendarDate(yNorm, m, d)) {
      const maxDays = new Date(yNorm, m, 0).getDate();
      return { isValid: false, error: `Invalid date: Month ${String(m).padStart(2, '0')} has ${maxDays} days` };
    }
    const iso = `${yNorm}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { isValid: true, iso, year: yNorm, month: m, day: d };
  }

  // Check for ISO format: YYYY-MM-DD
  const ymdMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);

    if (m < 1 || m > 12) {
      return { isValid: false, error: 'Month must be between 01 and 12' };
    }
    if (d < 1 || d > 31) {
      return { isValid: false, error: 'Day must be between 01 and 31' };
    }
    if (!isValidCalendarDate(y, m, d)) {
      const maxDays = new Date(y, m, 0).getDate();
      return { isValid: false, error: `Invalid date: Month ${String(m).padStart(2, '0')} has ${maxDays} days` };
    }
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { isValid: true, iso, year: y, month: m, day: d };
  }

  // Check for DD-MMM-YY format (e.g., 25-OCT-26)
  const mmmMatch = raw.match(/^(\d{1,2})[-/. ]?([A-Za-z]{3})[-/. ]?(\d{2,4})$/);
  if (mmmMatch) {
    const d = parseInt(mmmMatch[1], 10);
    const mStr = mmmMatch[2].toUpperCase();
    const mIdx = MONTH_NAMES.indexOf(mStr);
    const yNorm = normalizeYear(mmmMatch[3]);
    if (mIdx === -1) {
      return { isValid: false, error: 'Invalid month name' };
    }
    const m = mIdx + 1;
    if (d < 1 || d > 31) {
      return { isValid: false, error: 'Day must be between 01 and 31' };
    }
    if (!yNorm) {
      return { isValid: false, error: 'Year must be between 2000 and 2099' };
    }
    if (!isValidCalendarDate(yNorm, m, d)) {
      return { isValid: false, error: `Invalid day for ${mStr}` };
    }
    const iso = `${yNorm}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { isValid: true, iso, year: yNorm, month: m, day: d };
  }

  // Pure digits: 6 digits (DDMMYY) or 8 digits (DDMMYYYY or YYYYMMDD)
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length === 6) {
    const d = parseInt(digitsOnly.slice(0, 2), 10);
    const m = parseInt(digitsOnly.slice(2, 4), 10);
    const yNorm = normalizeYear(digitsOnly.slice(4, 6));

    if (m < 1 || m > 12) {
      return { isValid: false, error: 'Month must be between 01 and 12' };
    }
    if (d < 1 || d > 31) {
      return { isValid: false, error: 'Day must be between 01 and 31' };
    }
    if (!yNorm) {
      return { isValid: false, error: 'Year must be between 2000 and 2099' };
    }
    if (!isValidCalendarDate(yNorm, m, d)) {
      const maxDays = new Date(yNorm, m, 0).getDate();
      return { isValid: false, error: `Invalid date: Month ${String(m).padStart(2, '0')} has ${maxDays} days` };
    }
    const iso = `${yNorm}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { isValid: true, iso, year: yNorm, month: m, day: d };
  }

  if (digitsOnly.length === 8) {
    // Try DDMMYYYY
    const d = parseInt(digitsOnly.slice(0, 2), 10);
    const m = parseInt(digitsOnly.slice(2, 4), 10);
    const y = parseInt(digitsOnly.slice(4, 8), 10);
    if (isValidCalendarDate(y, m, d)) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { isValid: true, iso, year: y, month: m, day: d };
    }

    // Try YYYYMMDD
    const y2 = parseInt(digitsOnly.slice(0, 4), 10);
    const m2 = parseInt(digitsOnly.slice(4, 6), 10);
    const d2 = parseInt(digitsOnly.slice(6, 8), 10);
    if (isValidCalendarDate(y2, m2, d2)) {
      const iso = `${y2}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
      return { isValid: true, iso, year: y2, month: m2, day: d2 };
    }
  }

  return { isValid: false, error: 'Invalid date (expected DD-MM-YY)' };
}

/**
 * Formats a date string or Date object into "YYYY-MM-DD" for HTML date inputs or APIs.
 * Returns empty string if the date is invalid.
 */
export function formatDateForInput(dateVal: string | number | Date | null | undefined): string {
  const result = parseDateDetailed(dateVal);
  return result.isValid && result.iso ? result.iso : '';
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

/**
 * Formats any date string or Date object into "DD-MM-YY" (e.g. "25-10-26") for consistent display throughout the UI.
 */
export function formatDateToDDMMYY(dateVal: string | number | Date | null | undefined): string {
  if (!dateVal && dateVal !== 0) return '';
  const inputNorm = formatDateForInput(dateVal);
  if (!inputNorm) return String(dateVal).trim();

  const [y, m, d] = inputNorm.split('-');
  if (!y || !m || !d) return String(dateVal).trim();
  const shortYear = y.slice(-2);
  return `${d}-${m}-${shortYear}`;
}

/**
 * Auto-formats typed input into "DD-MM-YY" as the user types digits without needing to type hyphens.
 * If user types separators like "21-5-26", separator groupings are preserved.
 * E.g.: "25" -> "25", "251" -> "25-1", "2510" -> "25-10", "25102" -> "25-10-2", "251026" -> "25-10-26"
 */
export function formatTypingDate(input: string): string {
  if (!input) return '';

  // If user entered with separators (e.g. 11-5-26, 11-2471, 11/12/26)
  if (input.includes('-') || input.includes('/') || input.includes('.')) {
    const rawParts = input.split(/[-/.]/);
    const dayDigits = rawParts[0]?.replace(/\D/g, '') || '';
    const day = dayDigits.slice(0, 2);
    const overflowFromDay = dayDigits.slice(2);

    // Month part: strictly cap at 2 digits, any excess spills into Year
    const monthRaw = (rawParts[1] !== undefined ? rawParts[1] : '') + overflowFromDay;
    const monthDigits = monthRaw.replace(/\D/g, '');
    const month = monthDigits.slice(0, 2);
    const overflowFromMonth = monthDigits.slice(2);

    // Year part: cap at 4 digits (or 2 digits)
    const yearRaw = (rawParts[2] !== undefined ? rawParts[2] : '') + overflowFromMonth;
    const yearDigits = yearRaw.replace(/\D/g, '').slice(0, 4);

    const endsWithSep = /[-/.]$/.test(input);

    if (rawParts.length === 1) {
      return day;
    }
    if (rawParts.length === 2 && !overflowFromMonth) {
      if (endsWithSep && month.length === 0) {
        return `${day}-`;
      }
      return month ? `${day}-${month}` : `${day}-`;
    }

    if (yearDigits) {
      return `${day}-${month}-${yearDigits}`;
    }
    return `${day}-${month}-`;
  }

  // Pure digits typing (no separators typed by user)
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  // 8 digits (e.g. 11122026) -> take 2-digit year (26)
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(6, 8)}`;
}
