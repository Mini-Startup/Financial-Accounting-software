import { BalanceType } from './types';

/**
 * Universal date formatter strictly generating DD-MM-YY format (e.g. "18-11-26").
 * Supports Date instances, ISO strings, timestamps, and DD-MM-YYYY strings.
 */
export function formatDateToDDMMYY(dateVal: Date | string | number | null | undefined): string {
  if (!dateVal && dateVal !== 0) return '';

  let d: Date;
  if (dateVal instanceof Date) {
    d = dateVal;
  } else if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // Match DD-MM-YYYY or DD-MM-YY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      d = new Date(Date.UTC(year, month - 1, day));
    } else {
      d = new Date(trimmed);
    }
  } else {
    d = new Date(dateVal);
  }

  if (isNaN(d.getTime())) {
    return String(dateVal).trim();
  }

  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const shortYear = String(d.getUTCFullYear()).slice(-2);

  return `${day}-${month}-${shortYear}`;
}

/**
 * Parse an incoming date string into a UTC Date object representing
 * start of day (00:00:00.000) or end of day (23:59:59.999).
 */
export function parseDateBoundary(dateStr: string | undefined | null, isEndOfDay: boolean): Date | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();
  let year: number, month: number, day: number;

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);

  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10) - 1;
    year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
  } else if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;
    year = parsed.getUTCFullYear();
    month = parsed.getUTCMonth();
    day = parsed.getUTCDate();
  }

  if (isEndOfDay) {
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  } else {
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
}

/**
 * Resolves effective contract lot size for trade calculation.
 * Falls back to script lotSize, or default 1.
 */
export function getEffectiveMarketLot(tradeLot?: number | null, scriptLot?: number | null): number {
  if (tradeLot && tradeLot > 0) return tradeLot;
  if (scriptLot && scriptLot > 0) return scriptLot;
  return 1;
}

/**
 * Rounds a numeric floating point value to specified decimal places without binary float inaccuracies.
 */
export function roundTo(num: number, decimals: number = 2): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Determines debit/credit accounting classification based on signed amount.
 * Positive = Credit (Cr, Firm owes entity)
 * Negative = Debit (Dr, Entity owes firm)
 * Near-zero (< 0.005) = Nil
 */
export function determineBalanceType(amount: number): BalanceType {
  const rounded = roundTo(amount, 2);
  if (rounded > 0.005) return 'Cr';
  if (rounded < -0.005) return 'Dr';
  return 'Nil';
}

/**
 * Calculates weighted average rate for a collection of trade legs.
 */
export function calculateWeightedAverage(
  trades: Array<{ quantity: number; rate: number; marketLot: number }>
): number {
  let totalVolume = 0;
  let totalValue = 0;

  for (const t of trades) {
    const lot = t.marketLot > 0 ? t.marketLot : 1;
    const units = Math.abs(t.quantity) * lot;
    totalVolume += units;
    totalValue += units * t.rate;
  }

  if (totalVolume === 0) return 0;
  return roundTo(totalValue / totalVolume, 4);
}
