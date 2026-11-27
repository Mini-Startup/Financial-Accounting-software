/**
 * Dynamic Universal Closing Rate & Open Positions Parser
 *
 * Data-driven closing rates parser driven strictly by database template
 * mappings and business rules. Supports any broker's open positions / settlement format.
 */

import { generateDubaiSecurityName } from '../../components/trades/tradeImportHelpers';
import { formatCurrencySymbol } from '../../utils/currency';
import type {
  OpenPositionParsedRow,
  ParsedClosingRateItem,
  FileImportTemplateOption,
} from './types';
import {
  parseCsvLine,
  normalizeHeaderKey,
  normalizeDateToDDMMYYYY,
  parseNumeric,
} from './dynamicTradeParser';
import { detectFileTemplate, DEFAULT_CLOSING_RATE_TEMPLATES } from './templateDetector';

export function parseClosingRatesWithDynamicTemplate(
  rawContent: string,
  template?: FileImportTemplateOption | null
): OpenPositionParsedRow[] {
  const activeTemplate = template || DEFAULT_CLOSING_RATE_TEMPLATES[0];
  const delimiter = activeTemplate.delimiter || ',';
  const dataStartRow = activeTemplate.dataStartRow ?? 1;
  const headerRowIdx = activeTemplate.headerRowIndex ?? 0;

  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= dataStartRow) return [];

  // Parse Header Row
  const rawHeaders = parseCsvLine(lines[headerRowIdx], delimiter);
  const fileHeaderMap = new Map<string, number>();
  rawHeaders.forEach((h, idx) => {
    const norm = normalizeHeaderKey(h);
    if (norm && !fileHeaderMap.has(norm)) {
      fileHeaderMap.set(norm, idx);
    }
  });

  // Resolve Field Indices
  const fieldIndexMap = new Map<string, number>();
  const transformRules = new Map<string, string>();

  if (activeTemplate.mappings && activeTemplate.mappings.length > 0) {
    for (const m of activeTemplate.mappings) {
      let resolvedIdx: number | undefined;

      if (m.fileColumnHeader) {
        const normPrimary = normalizeHeaderKey(m.fileColumnHeader);
        if (fileHeaderMap.has(normPrimary)) {
          resolvedIdx = fileHeaderMap.get(normPrimary);
        }
      }

      if (resolvedIdx === undefined && m.alternateHeaders) {
        for (const alt of m.alternateHeaders) {
          const normAlt = normalizeHeaderKey(alt);
          if (fileHeaderMap.has(normAlt)) {
            resolvedIdx = fileHeaderMap.get(normAlt);
            break;
          }
        }
      }

      if (
        resolvedIdx === undefined &&
        m.fileColumnIndex !== undefined &&
        m.fileColumnIndex !== null &&
        m.fileColumnIndex >= 0 &&
        m.fileColumnIndex < rawHeaders.length
      ) {
        resolvedIdx = m.fileColumnIndex;
      }

      if (resolvedIdx !== undefined) {
        fieldIndexMap.set(m.appField, resolvedIdx);
      }
      if (m.transformRule) {
        transformRules.set(m.appField, m.transformRule);
      }
    }
  }

  // Resolve Options Filter column index
  let optionsFilterIndex: number | undefined;
  if (activeTemplate.optionsFilterRule) {
    if (activeTemplate.optionsFilterRule.columnHeader) {
      const norm = normalizeHeaderKey(activeTemplate.optionsFilterRule.columnHeader);
      if (fileHeaderMap.has(norm)) {
        optionsFilterIndex = fileHeaderMap.get(norm);
      }
    }
    if (optionsFilterIndex === undefined && activeTemplate.optionsFilterRule.columnIndex !== undefined) {
      optionsFilterIndex = activeTemplate.optionsFilterRule.columnIndex;
    }
  }

  const rows: OpenPositionParsedRow[] = [];

  for (let r = dataStartRow; r < lines.length; r++) {
    const rawLine = lines[r];
    const fields = parseCsvLine(rawLine, delimiter);
    if (fields.length === 0 || (fields.length === 1 && !fields[0])) continue;

    // 1. Check Options Filter Rule
    if (activeTemplate.optionsFilterRule && activeTemplate.optionsFilterRule.enabled !== false) {
      const optRule = activeTemplate.optionsFilterRule;
      const optIdx = optionsFilterIndex !== undefined ? optionsFilterIndex : -1;
      const optVal = optIdx >= 0 && optIdx < fields.length ? fields[optIdx].trim() : '';

      // Exclude values (e.g. ['OPTIONS', 'P', 'C', 'OPTCOM'])
      if (optRule.excludeValues && optRule.excludeValues.length > 0) {
        const isExcluded = optRule.excludeValues.some(
          (ex: string) => ex.toUpperCase() === optVal.toUpperCase()
        );
        if (isExcluded) continue;
      }

      // Include values (e.g. ['FUTCOM'])
      if (optRule.includeValues && optRule.includeValues.length > 0) {
        const isIncluded = optRule.includeValues.some(
          (inc: string) => inc.toUpperCase() === optVal.toUpperCase()
        );
        if (!isIncluded) continue;
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

    // Build rawRow map with uppercase header keys
    const rawRecord: Record<string, string> = {};
    rawHeaders.forEach((h, colIdx) => {
      const colVal = colIdx < fields.length ? fields[colIdx].trim() : '';
      rawRecord[h.toUpperCase()] = colVal;
    });

    const commodityCode = getCell('commodityCode', getCell('symbol', getCell('contractName')));
    const exchange = getCell('exchange', 'DGCX');
    const closingPrice = parseNumeric(getCell('closingPrice', getCell('settlPrice', '0')));

    if (!commodityCode && !exchange) continue;

    // Net lots calculation
    let netLotsStr = getCell('netLots');
    if (!netLotsStr) {
      const buyVal = getCell('buyLots', getCell('buy', ''));
      const sellVal = getCell('sellLots', getCell('sell', ''));
      if (buyVal !== '' || sellVal !== '') {
        const buyNum = parseNumeric(buyVal);
        const sellNum = parseNumeric(sellVal);
        netLotsStr = String(buyNum - sellNum);
        rawRecord['NET_LOTS'] = netLotsStr;
        rawRecord['BOUGHT_LOTS'] = String(buyNum);
        rawRecord['SOLD_LOTS'] = String(sellNum);
      }
    } else {
      rawRecord['NET_LOTS'] = netLotsStr;
    }

    const expiryDateRule = transformRules.get('expiryDate');
    const expiryDate = normalizeDateToDDMMYYYY(getCell('expiryDate'), expiryDateRule);

    const rawInstType = getCell('futureOption', getCell('instTypeCode', 'FUTURES'));
    const isOptionType =
      rawInstType.toUpperCase() === 'OPTCOM' ||
      rawInstType.toUpperCase() === 'OPTIONS' ||
      getCell('callPut') === 'P' ||
      getCell('callPut') === 'C';
    const futureOption = isOptionType ? 'OPTIONS' : 'FUTURES';

    rows.push({
      clientCode: getCell('clientCode', ''),
      groupCode: getCell('groupCode', ''),
      exchange,
      commodityCode,
      expiryDate,
      callPut: getCell('callPut', ''),
      futureOption,
      strikePrice: getCell('strikePrice', '0'),
      closingPrice,
      delMonth: getCell('delMonth', ''),
      rawRow: rawRecord,
    });
  }

  return rows;
}

export function processClosingRates(
  rawRows: OpenPositionParsedRow[],
  exchanges: any[],
  scripts: any[]
): ParsedClosingRateItem[] {
  // Deduplicate by Exchange + CommodityCode + ExpiryDate + CallPut + StrikePrice
  const rateMap = new Map<string, ParsedClosingRateItem>();

  for (const row of rawRows) {
    if (row.closingPrice <= 0) continue;
    // Skip options rows from closing rate extraction
    if (row.futureOption === 'OPTIONS' || row.callPut === 'P' || row.callPut === 'C') continue;

    const exCode = (row.exchange || '').toUpperCase();
    const commCode = (row.commodityCode || '').toUpperCase();

    // Resolve Exchange
    const exObj = exchanges.find((e) => e.code.toUpperCase() === exCode);

    // Resolve Script by matching shortName or fullName
    const scriptObj = scripts.find(
      (s) =>
        (s.shortName && s.shortName.toUpperCase() === commCode) ||
        (s.fullName && s.fullName.toUpperCase() === commCode)
    );

    // Security Name generation:
    const baseName = scriptObj?.fullName || scriptObj?.shortName || commCode;

    const generatedName =
      generateDubaiSecurityName(
        {
          delMonth: row.delMonth,
          expiryDate: row.expiryDate,
          callPut: row.callPut,
          strikePrice: row.strikePrice,
          rawCallPut: row.callPut,
        } as any,
        scriptObj || { fullName: baseName, shortName: baseName }
      ) || `${baseName} ${row.expiryDate}`.trim();

    const uniqueKey = `${exCode}_${generatedName.trim().toUpperCase()}`;

    const errors: string[] = [];
    if (!exObj) errors.push(`Exchange '${row.exchange}' not found in database`);
    if (!scriptObj) errors.push(`Script with code '${row.commodityCode}' not found in database`);

    const currCode = scriptObj?.currency?.code || row.rawRow['CURRENCY'] || 'USD';
    const currSym = formatCurrencySymbol(scriptObj?.currency?.symbol, currCode);

    const item: ParsedClosingRateItem = {
      exchangeCode: row.exchange,
      commodityCode: row.commodityCode,
      expiryDate: row.expiryDate,
      delMonth: row.delMonth,
      callPut: row.callPut,
      futureOption: row.futureOption,
      strikePrice: row.strikePrice,
      closingPrice: row.closingPrice,
      currencyCode: currCode,
      currencySymbol: currSym,
      securityName: generatedName,
      resolvedExchangeId: exObj?.id,
      resolvedScriptId: scriptObj?.id,
      scriptFullName: scriptObj?.fullName || baseName,
      status: errors.length === 0 ? 'Valid' : 'Unmapped',
      errors,
    };

    rateMap.set(uniqueKey, item);
  }

  return Array.from(rateMap.values());
}

/**
 * Backward-compatible exports
 */
export const processOpenPositionClosingRates = processClosingRates;

export function parseOpenPositionCSV(
  csvText: string,
  knownTemplate?: FileImportTemplateOption | null
): OpenPositionParsedRow[] {
  const tpl =
    knownTemplate ||
    detectFileTemplate(csvText, DEFAULT_CLOSING_RATE_TEMPLATES) ||
    DEFAULT_CLOSING_RATE_TEMPLATES[0];
  return parseClosingRatesWithDynamicTemplate(csvText, tpl);
}
