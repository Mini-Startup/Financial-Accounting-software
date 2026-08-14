import { generateDubaiSecurityName, cleanScriptFullName } from '../../components/trades/tradeImportHelpers';

export interface OpenPositionParsedRow {
  clientCode: string;
  groupCode: string;
  exchange: string;
  commodityCode: string;
  expiryDate: string;
  callPut: string;
  futureOption: string;
  strikePrice: string;
  closingPrice: number;
  delMonth: string;
  rawRow: Record<string, string>;
}

export interface ParsedClosingRateItem {
  exchangeCode: string;
  commodityCode: string;
  expiryDate: string;
  delMonth: string;
  callPut: string;
  futureOption: string;
  strikePrice: string;
  closingPrice: number;
  currencyCode?: string;
  currencySymbol?: string;
  
  // Resolved Security details
  securityName: string;
  resolvedExchangeId?: string;
  resolvedScriptId?: string;
  scriptFullName?: string;
  status: 'Valid' | 'Unmapped';
  errors: string[];
}

export function parseOpenPositionCSV(csvText: string): OpenPositionParsedRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().toUpperCase());

  const rows: OpenPositionParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map((v) => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });

    const exchange = record['EXCHANGE'] || record['MARKET'] || '';
    const commodityCode = record['COMMODITY_CODE'] || record['COMMODITY'] || record['TICKCODE'] || '';
    const closingPrice = parseFloat(record['CLOSING_PRICE'] || record['CLOSING_RATE'] || record['CLOSE_PRICE'] || '0') || 0;

    if (!commodityCode && !exchange) continue;

    rows.push({
      clientCode: record['CLIENTCODE'] || '',
      groupCode: record['GROUP_CODE'] || '',
      exchange,
      commodityCode,
      expiryDate: record['EXPIRY_DATE'] || '',
      callPut: record['CALLPUT'] || record['CALL_PUT'] || '',
      futureOption: record['FUTURE_OPTION'] || record['INSTRUMENT_TYPE'] || 'FUTURES',
      strikePrice: record['STRIKE_PRICE'] || '',
      closingPrice,
      delMonth: record['DELMONTH'] || '',
      rawRow: record,
    });
  }

  return rows;
}

export function processOpenPositionClosingRates(
  rawRows: OpenPositionParsedRow[],
  exchanges: any[],
  scripts: any[]
): ParsedClosingRateItem[] {
  // Deduplicate by Exchange + CommodityCode + ExpiryDate + CallPut + StrikePrice
  const rateMap = new Map<string, ParsedClosingRateItem>();

  for (const row of rawRows) {
    if (row.closingPrice <= 0) continue;

    const exCode = row.exchange.toUpperCase();
    const commCode = row.commodityCode.toUpperCase();

    // Resolve Exchange
    const exObj = exchanges.find((e) => e.code.toUpperCase() === exCode);

    // Resolve Script by matching shortName or fullName
    const scriptObj = scripts.find(
      (s) => (s.shortName && s.shortName.toUpperCase() === commCode) ||
             (s.fullName && s.fullName.toUpperCase() === commCode)
    );

    // Security Name generation:
    // User requirement: Must use Script Full Name (scriptObj.fullName) from database
    const baseName = scriptObj?.fullName || scriptObj?.shortName || commCode;
    
    // Generate security name using helper
    const generatedName = generateDubaiSecurityName(
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
    const currSym = scriptObj?.currency?.symbol || (currCode.toUpperCase() === 'INR' ? '₹' : '$');

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
