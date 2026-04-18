import type { ParsedTrade, ParseError, ParseResult, FieldMapping } from './types';
import { DEFAULT_MAPPING } from './fieldMappings';

// ─── Row Splitter ───────────────────────────────────────────────

/**
 * Splits raw file content into individual lines.
 * Filters out empty lines and lines that are clearly corrupted
 * (e.g. fewer than 2 commas — can't be a valid trade row).
 */
function splitRows(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      // A valid trade row must have at least several comma-separated fields
      const commaCount = (line.match(/,/g) || []).length;
      return commaCount >= 10;
    });
}

// ─── Transformers ───────────────────────────────────────────────

/**
 * Maps the buy/sell flag integer to a readable label.
 * 1 → BUY, 2 → SELL
 */
function transformBuySell(flag: string): 'BUY' | 'SELL' | null {
  const trimmed = flag.trim();
  if (trimmed === '1') return 'BUY';
  if (trimmed === '2') return 'SELL';
  return null;
}

/**
 * Normalizes a date string like "10 Apr 2026 10:12:07" into "2026-04-10 10:12:07".
 * Falls back to the raw string if parsing fails.
 */
function parseDateTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const date = new Date(trimmed);
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
  const safeGet = (index: number): string => {
    if (index >= 0 && index < fields.length) {
      return fields[index].trim();
    }
    return '';
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split(',');

    // Check minimum field count based on the highest index in the mapping
    const maxIndex = Math.max(...Object.values(mapping));
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
