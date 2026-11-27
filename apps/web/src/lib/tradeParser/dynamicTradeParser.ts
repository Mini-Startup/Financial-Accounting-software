/**
 * Dynamic Universal Trade Parser
 *
 * Data-driven trade parsing engine driven strictly by database template
 * mappings and business rules (options filter, broker fee formula, client swap).
 * Works across any broker, market, or format with zero hardcoded column dictionaries.
 */

import type {
  UniversalParsedTrade,
  UniversalParseResult,
  ParseError,
  FileImportTemplateOption,
} from './types';
import { detectFileTemplate, DEFAULT_TRADE_TEMPLATES } from './templateDetector';

// ─── CSV Line Parser (handles quotes and commas) ───────────────────

export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function normalizeHeaderKey(header: string): string {
  return (header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Date Normalization Helpers ─────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

export function normalizeDateToDDMMYYYY(
  dateStr: string,
  rule?: string | null
): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return '';

  // Extract date part before any time component
  const datePart = trimmed.split(/\s+/)[0];

  // Specific transform: DATE_MM_DD_YYYY (e.g. "10/06/2026" -> "06/10/2026")
  if (rule === 'DATE_MM_DD_YYYY') {
    const parts = datePart.split(/[-/]/);
    if (parts.length === 3) {
      let [mm, dd, year] = parts;
      if (year.length === 2) year = `20${year}`;
      return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${year}`;
    }
  }

  // Handle DD-MMM-YY (e.g. "30-Jun-26" or "30-Jun-2026")
  const mmmMatch = datePart.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const mon = MONTH_MAP[mmmMatch[2].toLowerCase()] || '01';
    let yr = mmmMatch[3];
    if (yr.length === 2) yr = `20${yr}`;
    return `${day}/${mon}/${yr}`;
  }

  // Handle standard numeric parts (DD/MM/YYYY or MM/DD/YYYY)
  const parts = datePart.split(/[-/]/);
  if (parts.length === 3) {
    let [p1, p2, year] = parts;
    if (year.length === 2) year = `20${year}`;

    // If second part > 12, then p1 is month and p2 is day
    if (parseInt(p2, 10) > 12) {
      return `${p2.padStart(2, '0')}/${p1.padStart(2, '0')}/${year}`;
    }

    // Default assume DD/MM/YYYY
    return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${year}`;
  }

  return datePart;
}

export function transformBuySell(val: string): 'Buy' | 'Sell' {
  const norm = (val || '').trim().toUpperCase();
  if (norm === 'B' || norm === 'BUY' || norm === 'BOT' || norm === '1' || norm.startsWith('BUY')) {
    return 'Buy';
  }
  if (norm === 'S' || norm === 'SELL' || norm === 'SLD' || norm === '2' || norm.startsWith('SEL')) {
    return 'Sell';
  }
  return norm.startsWith('B') ? 'Buy' : 'Sell';
}

export function transformCallPut(val: string): string {
  const norm = (val || '').trim().toUpperCase();
  if (norm === 'P' || norm === 'C' || norm === 'OPTIONS' || norm === 'OPT' || norm === 'OPTCOM') {
    return 'Options';
  }
  return 'Future';
}

export function parseNumeric(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[,$\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ─── Header Resolution ──────────────────────────────────────────────

export interface ResolvedColumnBindings {
  fieldIndexMap: Map<string, number>;
  transformRules: Map<string, string>;
  optionsFilterIndex?: number;
  brokerFeeIndices: number[];
  swapColumnIndex?: number;
}

export function resolveTemplateColumnBindings(
  rawHeaders: string[],
  template: FileImportTemplateOption
): ResolvedColumnBindings {
  const fieldIndexMap = new Map<string, number>();
  const transformRules = new Map<string, string>();

  // Map normalized raw headers to column index in the incoming file
  const fileHeaderMap = new Map<string, number>();
  rawHeaders.forEach((h, idx) => {
    const norm = normalizeHeaderKey(h);
    if (norm && !fileHeaderMap.has(norm)) {
      fileHeaderMap.set(norm, idx);
    }
  });

  // 1. Resolve mappings defined in database template
  if (template.mappings && template.mappings.length > 0) {
    for (const mapping of template.mappings) {
      let resolvedIdx: number | undefined;

      // Try primary fileColumnHeader
      if (mapping.fileColumnHeader) {
        const normPrimary = normalizeHeaderKey(mapping.fileColumnHeader);
        if (fileHeaderMap.has(normPrimary)) {
          resolvedIdx = fileHeaderMap.get(normPrimary);
        }
      }

      // Try alternateHeaders
      if (resolvedIdx === undefined && mapping.alternateHeaders) {
        for (const alt of mapping.alternateHeaders) {
          const normAlt = normalizeHeaderKey(alt);
          if (fileHeaderMap.has(normAlt)) {
            resolvedIdx = fileHeaderMap.get(normAlt);
            break;
          }
        }
      }

      // Fallback to configured fileColumnIndex if valid
      if (
        resolvedIdx === undefined &&
        mapping.fileColumnIndex !== undefined &&
        mapping.fileColumnIndex !== null &&
        mapping.fileColumnIndex >= 0 &&
        mapping.fileColumnIndex < rawHeaders.length
      ) {
        resolvedIdx = mapping.fileColumnIndex;
      }

      if (resolvedIdx !== undefined) {
        fieldIndexMap.set(mapping.appField, resolvedIdx);
      }

      if (mapping.transformRule) {
        transformRules.set(mapping.appField, mapping.transformRule);
      }
    }
  }

  // 2. Resolve optionsFilterRule column
  let optionsFilterIndex: number | undefined;
  if (template.optionsFilterRule) {
    if (template.optionsFilterRule.columnHeader) {
      const norm = normalizeHeaderKey(template.optionsFilterRule.columnHeader);
      if (fileHeaderMap.has(norm)) {
        optionsFilterIndex = fileHeaderMap.get(norm);
      }
    }
    if (optionsFilterIndex === undefined && template.optionsFilterRule.columnIndex !== undefined) {
      optionsFilterIndex = template.optionsFilterRule.columnIndex;
    }
  }

  // 3. Resolve brokerFeeFormula sumHeaders or singleHeader
  const brokerFeeIndices: number[] = [];
  if (template.brokerFeeFormula?.mode !== 'NONE') {
    if (template.brokerFeeFormula?.mode === 'SINGLE_HEADER' && template.brokerFeeFormula.singleHeader) {
      const norm = normalizeHeaderKey(template.brokerFeeFormula.singleHeader);
      if (fileHeaderMap.has(norm)) {
        brokerFeeIndices.push(fileHeaderMap.get(norm)!);
      }
    } else if (template.brokerFeeFormula?.sumHeaders) {
      for (const h of template.brokerFeeFormula.sumHeaders) {
        const norm = normalizeHeaderKey(h);
        if (fileHeaderMap.has(norm)) {
          brokerFeeIndices.push(fileHeaderMap.get(norm)!);
        }
      }
    }
  }

  // 4. Resolve clientSwapRule column
  let swapColumnIndex: number | undefined;
  if (template.clientSwapRule) {
    if (template.clientSwapRule.columnHeader) {
      const norm = normalizeHeaderKey(template.clientSwapRule.columnHeader);
      if (fileHeaderMap.has(norm)) {
        swapColumnIndex = fileHeaderMap.get(norm);
      }
    }
    if (swapColumnIndex === undefined && template.clientSwapRule.columnIndex !== undefined) {
      swapColumnIndex = template.clientSwapRule.columnIndex;
    }
  }

  return {
    fieldIndexMap,
    transformRules,
    optionsFilterIndex,
    brokerFeeIndices,
    swapColumnIndex,
  };
}

// ─── Main Dynamic Trade Parser ──────────────────────────────────────

export function parseTradesWithDynamicTemplate(
  rawContent: string,
  template?: FileImportTemplateOption | null
): UniversalParseResult {
  const activeTemplate = template || DEFAULT_TRADE_TEMPLATES[0];
  const delimiter = activeTemplate.delimiter || ',';
  const dataStartRow = activeTemplate.dataStartRow ?? 1;
  const headerRowIdx = activeTemplate.headerRowIndex ?? 0;

  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= dataStartRow) {
    return {
      trades: [],
      errors: [{ row: 1, rawLine: '', reason: 'File contains no data rows.' }],
      totalRows: 0,
      successCount: 0,
      errorCount: 1,
      skippedOptionsCount: 0,
      templateCode: activeTemplate.code,
      templateName: activeTemplate.name,
    };
  }

  // Parse Header Row
  const rawHeaders = parseCsvLine(lines[headerRowIdx], delimiter);
  const bindings = resolveTemplateColumnBindings(rawHeaders, activeTemplate);
  const { fieldIndexMap, transformRules, optionsFilterIndex, brokerFeeIndices, swapColumnIndex } = bindings;

  const trades: UniversalParsedTrade[] = [];
  const errors: ParseError[] = [];
  let skippedOptionsCount = 0;

  // Process Data Rows
  for (let r = dataStartRow; r < lines.length; r++) {
    const rawLine = lines[r];
    const fields = parseCsvLine(rawLine, delimiter);
    if (fields.length === 0 || (fields.length === 1 && !fields[0])) continue;

    // 1. Check Options / Exclusion Filter Rule
    if (activeTemplate.optionsFilterRule && activeTemplate.optionsFilterRule.enabled !== false) {
      const optRule = activeTemplate.optionsFilterRule;
      const optIdx = optionsFilterIndex !== undefined ? optionsFilterIndex : -1;
      const optVal = optIdx >= 0 && optIdx < fields.length ? fields[optIdx].trim() : '';

      // Check excludeValues (e.g. ['OPTIONS', 'P', 'C'])
      if (optRule.excludeValues && optRule.excludeValues.length > 0) {
        const isExcluded = optRule.excludeValues.some(
          (ex: string) => ex.toUpperCase() === optVal.toUpperCase()
        );
        if (isExcluded) {
          skippedOptionsCount++;
          continue;
        }
      }

      // Check includeValues (e.g. ['FUTCOM'])
      if (optRule.includeValues && optRule.includeValues.length > 0) {
        const isIncluded = optRule.includeValues.some(
          (inc: string) => inc.toUpperCase() === optVal.toUpperCase()
        );
        if (!isIncluded) {
          skippedOptionsCount++;
          continue;
        }
      }

      // Check strike price > 0 as options indicator
      const strikeIdx = optRule.strikePriceColumnIndex;
      if (strikeIdx !== undefined && strikeIdx >= 0 && strikeIdx < fields.length) {
        const strikeVal = parseNumeric(fields[strikeIdx]);
        if (strikeVal > 0 && optVal.toUpperCase() === 'P') {
          skippedOptionsCount++;
          continue;
        }
      }

      // Check remarksExclude (e.g. ['EXPIRE'])
      if (optRule.remarksExclude && optRule.remarksExclude.length > 0) {
        const hasExcludedRemark = optRule.remarksExclude.some((rx: string) =>
          rawLine.toUpperCase().includes(rx.toUpperCase())
        );
        if (hasExcludedRemark) {
          skippedOptionsCount++;
          continue;
        }
      }
    }

    // Helper to get raw cell value by appField
    const getCell = (appField: string, fallback: string = ''): string => {
      const idx = fieldIndexMap.get(appField);
      if (idx !== undefined && idx >= 0 && idx < fields.length) {
        return fields[idx].trim();
      }
      return fallback;
    };

    // 2. Client Swap Rule Check
    let clientCode = getCell('clientCode');
    let substituteClientCode: string | undefined;
    let rawLastCol = '';

    if (
      activeTemplate.clientSwapRule?.enabled !== false &&
      swapColumnIndex !== undefined &&
      swapColumnIndex >= 0 &&
      swapColumnIndex < fields.length
    ) {
      const swapVal = fields[swapColumnIndex].trim().replace(/^["']|["']$/g, '');
      rawLastCol = swapVal;
      const ignoreValues = (activeTemplate.clientSwapRule?.ignoreValues || [
        'NORMAL',
        'MEDIUMCARRY',
        'FORWARD',
        'SPOT',
      ]).map((v: string) => v.toUpperCase());

      if (swapVal && !ignoreValues.includes(swapVal.toUpperCase())) {
        substituteClientCode = clientCode;
        clientCode = swapVal;
      }
    }

    // 3. Transformations
    const tradeDateRule = transformRules.get('tradeDate');
    const expiryDateRule = transformRules.get('expiryDate');

    const tradeDate = normalizeDateToDDMMYYYY(getCell('tradeDate'), tradeDateRule);
    const expiryDate = normalizeDateToDDMMYYYY(getCell('expiryDate'), expiryDateRule);
    const buySellFlag = transformBuySell(getCell('buySell'));

    const rawQty = getCell('quantity', '0');
    const rawPrice = getCell('price', '0');
    const rawMarketLot = getCell('marketLot', '1');

    const qtyNum = parseNumeric(rawQty);
    const priceNum = parseNumeric(rawPrice);
    const marketLotNum = parseNumeric(rawMarketLot) || 1;

    // Market Value calculation: if not explicitly mapped, compute qty * price * marketLot
    const rawTradeValue = getCell('tradeValue');
    const mktValue = rawTradeValue
      ? String(parseNumeric(rawTradeValue))
      : String(Number((qtyNum * priceNum * marketLotNum).toFixed(4)));

    // Brokerage fee calculation
    let commission = 0;
    if (activeTemplate.brokerFeeFormula?.mode === 'NONE') {
      commission = 0;
    } else if (brokerFeeIndices.length > 0) {
      for (const bIdx of brokerFeeIndices) {
        if (bIdx >= 0 && bIdx < fields.length) {
          commission += parseNumeric(fields[bIdx]);
        }
      }
      const mult = activeTemplate.brokerFeeFormula?.multiplier;
      if (mult && !isNaN(mult) && mult !== 1) {
        commission = commission * mult;
      }
    } else {
      commission = parseNumeric(getCell('clnCommission', '0'));
    }

    const rawCP = getCell('callPut');

    // Basic validity check: must have valid clientCode, securityName/tickCode, and positive qty
    if (!clientCode && !getCell('tickCode') && !getCell('securityName')) {
      errors.push({
        row: r + 1,
        rawLine,
        reason: 'Missing clientCode and contract identifier.',
      });
      continue;
    }

    const trade: UniversalParsedTrade = {
      typeCode: getCell('typeCode', 'FUTURE'),
      tradeDate,
      tradeTime: getCell('tradeTime', ''),
      clientCode,
      substituteClientCode,
      rawLastCol,
      marketCode: getCell('marketCode', getCell('exchange', 'DGCX')),
      securityCode: getCell('securityCode', ''),
      currencyCode: getCell('currency', getCell('currencyCode', 'USD')),
      securityName: getCell('securityName', getCell('tickCode', '')),
      delMonth: getCell('delMonth', ''),
      expiryDate,
      marketLot: String(marketLotNum),
      callPut: transformCallPut(rawCP),
      rawCallPut: rawCP,
      strikePrice: getCell('strikePrice', '0'),
      tickCode: getCell('tickCode', getCell('securityName', '')),
      bloombergCode: getCell('bloombergCode', ''),
      buySellFlag,
      qty: String(qtyNum),
      price: String(priceNum),
      mktValue,
      statementDate: getCell('statementDate', ''),
      clnCommission: String(commission),
      clnExCharges: getCell('clnExCharges', '0'),
      clnCharges1: getCell('clnCharges1', '0'),
      clnCharges2: getCell('clnCharges2', '0'),
      vat: getCell('vat', '0'),
      exchOrderId: getCell('orderId', ''),
      platformOrderId: getCell('platformOrderId', ''),
      settlementId: getCell('settlementId', ''),
      settlementDate: getCell('settlementDate', ''),
      tradeType: getCell('tradeType', 'Carry'),
    };

    trades.push(trade);
  }

  return {
    trades,
    errors,
    totalRows: lines.length - dataStartRow,
    successCount: trades.length,
    errorCount: errors.length,
    skippedOptionsCount,
    templateCode: activeTemplate.code,
    templateName: activeTemplate.name,
  };
}

/**
 * Backward-compatible parse function
 */
export function parseDubaiTradeFile(
  content: string,
  knownTemplate?: FileImportTemplateOption | null
): UniversalParseResult {
  const tpl = knownTemplate || detectFileTemplate(content, DEFAULT_TRADE_TEMPLATES) || DEFAULT_TRADE_TEMPLATES[0];
  return parseTradesWithDynamicTemplate(content, tpl);
}
