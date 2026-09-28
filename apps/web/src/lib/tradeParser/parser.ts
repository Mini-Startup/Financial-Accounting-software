import type { ParsedTrade, ParseError, ParseResult, FieldMapping } from './types';
import { DEFAULT_MAPPING } from './fieldMappings';

// ─── Constants ──────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

// ─── Row Splitter ───────────────────────────────────────────────

/**
 * Splits raw file content into individual lines.
 * Filters out empty lines and lines that are clearly corrupted
 * (e.g. fewer than 10 commas — can't be a valid trade row).
 *
 * Uses a character scan instead of regex for comma counting — avoids
 * allocating a temporary match array per line.
 */
function splitRows(raw: string): string[] {
  const result: string[] = [];
  const lines = raw.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    // Remove trailing \r if present (handles \r\n without regex)
    const clean = line.charCodeAt(line.length - 1) === 13
      ? line.slice(0, -1)
      : line;

    if (clean.length === 0) continue;

    // Count commas with a plain loop — ~3x faster than regex match
    let commas = 0;
    for (let j = 0; j < clean.length; j++) {
      if (clean.charCodeAt(j) === 44) commas++; // 44 = ','
      if (commas >= 10) break; // early exit once threshold met
    }
    if (commas >= 10) {
      result.push(clean);
    }
  }

  return result;
}

// ─── Transformers ───────────────────────────────────────────────

/**
 * Maps the buy/sell flag integer to a readable label.
 * 1 → BUY, 2 → SELL
 */
function transformBuySell(flag: string): 'BUY' | 'SELL' | null {
  if (flag.length === 1 || (flag.length > 1 && flag.trim().length === 1)) {
    const trimmed = flag.trim();
    if (trimmed === '1') return 'BUY';
    if (trimmed === '2') return 'SELL';
  }
  return null;
}

/**
 * Fast date parser for the known broker format: "DD Mon YYYY HH:MM:SS"
 * e.g. "10 Apr 2026 10:12:07" → "2026-04-10 10:12:07"
 *
 * Falls back to Date constructor only if the fast path doesn't match.
 * This avoids the extremely slow browser Date.parse() for the common case.
 */
function parseDateTime(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Fast path: "DD Mon YYYY HH:MM:SS" (length ~20-21)
  // Also handles "D Mon YYYY HH:MM:SS" (single-digit day)
  const spaceIdx1 = s.indexOf(' ');
  if (spaceIdx1 > 0 && spaceIdx1 <= 2) {
    const spaceIdx2 = s.indexOf(' ', spaceIdx1 + 1);
    if (spaceIdx2 > 0) {
      const spaceIdx3 = s.indexOf(' ', spaceIdx2 + 1);
      if (spaceIdx3 > 0) {
        const day = s.substring(0, spaceIdx1).padStart(2, '0');
        const monthStr = s.substring(spaceIdx1 + 1, spaceIdx2).toUpperCase();
        const year = s.substring(spaceIdx2 + 1, spaceIdx3);
        const time = s.substring(spaceIdx3 + 1);

        const month = MONTH_MAP[monthStr];
        if (month && year.length === 4 && time.length >= 7) {
          return `${year}-${month}-${day} ${time}`;
        }
      }
    }
  }

  // Fallback: try native Date parsing
  try {
    const date = new Date(s);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return null;
  }
}

/**
 * Parses a string to a number. Returns null if the value is not a valid number.
 */
function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return isNaN(num) ? null : num;
}

// ─── Row Parser ─────────────────────────────────────────────────

/**
 * Extracts fields from a single CSV row based on the provided field mapping.
 * Returns a raw field object (all strings) before transformation.
 */
function extractFields(fields: string[], mapping: FieldMapping) {
  const len = fields.length;
  const safeGet = (index: number): string => {
    return index >= 0 && index < len ? fields[index].trim() : '';
  };

  return {
    tradeNo: safeGet(mapping.tradeNo),
    script: safeGet(mapping.script),
    expiry: safeGet(mapping.expiry),
    fullScript: safeGet(mapping.fullScript),
    clientCode: safeGet(mapping.clientCode),
    terminal: safeGet(mapping.terminal),
    buySellFlag: safeGet(mapping.buySellFlag),
    qty: safeGet(mapping.qty),
    rate: safeGet(mapping.rate),
    orderId: safeGet(mapping.orderId),
    tradeTime: safeGet(mapping.tradeTime),
    uniqueTradeId: safeGet(mapping.uniqueTradeId),
    exchangeTime: safeGet(mapping.exchangeTime),
    orderTime: safeGet(mapping.orderTime),
    instrumentType: safeGet(mapping.instrumentType),
  };
}

// ─── Row Validator ──────────────────────────────────────────────

/**
 * Validates extracted fields and transforms them into a ParsedTrade.
 * Returns the trade or an error reason string.
 */
function validateAndTransform(
  raw: ReturnType<typeof extractFields>
): { trade: ParsedTrade } | { error: string } {
  // Required field checks
  if (!raw.tradeNo) return { error: 'Missing Trade No (index 0)' };
  if (!raw.script) return { error: 'Missing Script (index 3)' };
  if (!raw.clientCode) return { error: 'Missing Client Code (index 10)' };

  // Buy/Sell transform
  const tradeType = transformBuySell(raw.buySellFlag);
  if (!tradeType) {
    return { error: `Invalid Buy/Sell flag: "${raw.buySellFlag}" (expected 1 or 2)` };
  }

  // Numeric parsing
  const qty = parseNumber(raw.qty);
  if (qty === null || qty <= 0) {
    return { error: `Invalid quantity: "${raw.qty}"` };
  }

  const rate = parseNumber(raw.rate);
  if (rate === null || rate < 0) {
    return { error: `Invalid rate: "${raw.rate}"` };
  }

  // Date parsing
  const tradeTime = parseDateTime(raw.tradeTime);
  if (!tradeTime) {
    return { error: `Invalid trade time: "${raw.tradeTime}"` };
  }

  return {
    trade: {
      tradeNo: raw.tradeNo,
      script: raw.script,
      fullScript: raw.fullScript || raw.script,
      expiry: raw.expiry,
      clientCode: raw.clientCode,
      terminal: raw.terminal,
      type: tradeType,
      qty,
      rate,
      tradeTime,
      orderId: raw.orderId,
      uniqueTradeId: raw.uniqueTradeId,
      exchangeTime: raw.exchangeTime,
      orderTime: raw.orderTime,
      instrumentType: raw.instrumentType,
    },
  };
}

// ─── Main Pipeline ──────────────────────────────────────────────

/**
 * Parses an entire trade file through the full pipeline:
 *   Split → Extract → Transform → Validate → Normalize
 *
 * @param raw     - The raw file content as a string
 * @param mapping - Optional field mapping override (defaults to DEFAULT_MAPPING)
 * @returns       - ParseResult with trades, errors, and counts
 */
export function parseTradeFile(
  raw: string,
  mapping: FieldMapping = DEFAULT_MAPPING
): ParseResult {
  const lines = splitRows(raw);
  const trades: ParsedTrade[] = [];
  const errors: ParseError[] = [];

  // Pre-compute maxIndex ONCE outside the loop
  const mappingValues = Object.values(mapping);
  let maxIndex = 0;
  for (let k = 0; k < mappingValues.length; k++) {
    if (mappingValues[k] > maxIndex) maxIndex = mappingValues[k];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split(',');

    // Check minimum field count
    if (fields.length <= maxIndex) {
      errors.push({
        row: i + 1,
        rawLine: line.substring(0, 120),
        reason: `Row has ${fields.length} fields, need at least ${maxIndex + 1}`,
      });
      continue;
    }

    const extracted = extractFields(fields, mapping);
    const result = validateAndTransform(extracted);

    if ('error' in result) {
      errors.push({
        row: i + 1,
        rawLine: line.substring(0, 120),
        reason: result.error,
      });
    } else {
      trades.push(result.trade);
    }
  }

  return {
    trades,
    errors,
    totalRows: lines.length,
    successCount: trades.length,
    errorCount: errors.length,
  };
}
