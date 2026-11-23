import type { DubaiParsedTrade, DubaiParseResult, ParseError } from './types';

// ─── Header Alias Lookup ──────────────────────────────────────────

const HEADER_KEY_MAP: Record<string, keyof DubaiParsedTrade> = {
  // TypeCode / Sr / Status
  typecode: 'typeCode',
  type_code: 'typeCode',
  type: 'typeCode',
  sr: 'typeCode',
  srno: 'typeCode',
  status: 'typeCode',
  tx: 'typeCode',

  // Trade Date
  tradedate: 'tradeDate',
  trade_date: 'tradeDate',
  date: 'tradeDate',

  // Trade Time
  tradetime: 'tradeTime',
  trade_time: 'tradeTime',
  time: 'tradeTime',

  // Client Code
  clientcode: 'clientCode',
  client_code: 'clientCode',
  client: 'clientCode',
  clncode: 'clientCode',
  cln_code: 'clientCode',
  custcode: 'clientCode',
  cust_code: 'clientCode',
  cust: 'clientCode',

  // Market Code / Exchange
  marketcode: 'marketCode',
  market_code: 'marketCode',
  exchange: 'marketCode',
  exchangecode: 'marketCode',
  market: 'marketCode',

  // Security Code
  securitycode: 'securityCode',
  security_code: 'securityCode',

  // Currency Code
  currencycode: 'currencyCode',
  currency_code: 'currencyCode',
  currency: 'currencyCode',
  curr: 'currencyCode',

  // Security Name
  securityname: 'securityName',
  security_name: 'securityName',
  secname: 'securityName',
  instument: 'securityName',
  instrument: 'securityName',

  // Delivery Month
  delmonth: 'delMonth',
  del_month: 'delMonth',
  deliverymonth: 'delMonth',

  // Expiry Date
  expirydate: 'expiryDate',
  expiry_date: 'expiryDate',
  expiry: 'expiryDate',

  // Market Lot
  marketlot: 'marketLot',
  market_lot: 'marketLot',
  lot: 'marketLot',
  lotsize: 'marketLot',
  lot_size: 'marketLot',

  // Call Put
  callput: 'callPut',
  call_put: 'callPut',
  cp: 'callPut',

  // Strike Price
  strikeprice: 'strikePrice',
  strike_price: 'strikePrice',
  strike: 'strikePrice',

  // Tick Code / Script
  tickcode: 'tickCode',
  tick_code: 'tickCode',
  script: 'tickCode',
  scriptcode: 'tickCode',
  symbol: 'tickCode',
  contractcode: 'tickCode',
  contract_code: 'tickCode',

  // Bloomberg Code
  bloombergcode: 'bloombergCode',
  bloomberg_code: 'bloombergCode',
  bbgcode: 'bloombergCode',

  // Buy Sell Flag
  buysellflag: 'buySellFlag',
  buy_sell_flag: 'buySellFlag',
  buysell: 'buySellFlag',
  bs: 'buySellFlag',
  side: 'buySellFlag',

  // Quantity
  qty: 'qty',
  quantity: 'qty',
  tradedqty: 'qty',
  qtylot: 'qty',

  // Price / Rate
  price: 'price',
  rate: 'price',
  tradedprice: 'price',
  tradeprice: 'price',
  trade_price: 'price',

  // Market Value
  mktvalue: 'mktValue',
  mkt_value: 'mktValue',
  marketvalue: 'mktValue',
  value: 'mktValue',
  tradevalue: 'mktValue',
  trade_value: 'mktValue',

  // Statement Date
  statementdate: 'statementDate',
  statement_date: 'statementDate',

  // Commission & Charges
  clncommission: 'clnCommission',
  cln_commission: 'clnCommission',
  commission: 'clnCommission',
  brokerage: 'clnCommission',

  clnexcharges: 'clnExCharges',
  cln_ex_charges: 'clnExCharges',
  excharges: 'clnExCharges',

  clncharges1: 'clnCharges1',
  cln_charges1: 'clnCharges1',

  clncharges2: 'clnCharges2',
  cln_charges2: 'clnCharges2',

  vat: 'vat',

  // Order IDs
  exchorderid: 'exchOrderId',
  exch_order_id: 'exchOrderId',
  orderid: 'exchOrderId',
  order_id: 'exchOrderId',
  traderefno: 'exchOrderId',
  trade_ref_no: 'exchOrderId',
  refno: 'exchOrderId',

  platformorderid: 'platformOrderId',
  platform_order_id: 'platformOrderId',

  settlementid: 'settlementId',
  settlement_id: 'settlementId',

  settlementdate: 'settlementDate',
  settlement_date: 'settlementDate',

  tradetype: 'tradeType',
  trade_type: 'tradeType',
};

// ─── Transformers ───────────────────────────────────────────────

function transformCallPut(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '0' || trimmed === '.00') return 'Future';
  if (trimmed.toUpperCase() === 'P') return 'Options';
  if (trimmed.toUpperCase() === 'C') return 'Options';
  return trimmed;
}

function transformBuySell(value: string): string {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === 'B' || trimmed === 'BUY' || trimmed === '1') return 'Buy';
  if (trimmed === 'S' || trimmed === 'SELL' || trimmed === '2') return 'Sell';
  return value.trim();
}

function normalizeHeaderKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildColumnIndexMap(headerFields: string[]): Map<keyof DubaiParsedTrade, number> | undefined {
  const indexMap = new Map<keyof DubaiParsedTrade, number>();

  headerFields.forEach((field, colIdx) => {
    const norm = normalizeHeaderKey(field);
    const targetKey = HEADER_KEY_MAP[norm];
    if (targetKey && !indexMap.has(targetKey)) {
      indexMap.set(targetKey, colIdx);
    }
  });

  // Valid header map if it found at least Qty or Price or SecurityName or Tickcode
  if (indexMap.has('qty') || indexMap.has('price') || indexMap.has('securityName') || indexMap.has('tickCode')) {
    return indexMap;
  }
  return undefined;
}

// ─── Columns Detection Heuristics ───────────────────────────────

function detectColumnsHeuristically(rows: string[][]): {
  buySellIdx?: number;
  qtyIdx?: number;
  priceIdx?: number;
} {
  const numRows = rows.length;
  if (numRows <= 1) return {};

  const firstDataRow = rows[1];
  const numCols = firstDataRow.length;

  let buySellIdx: number | undefined = undefined;
  let qtyIdx: number | undefined = undefined;
  let priceIdx: number | undefined = undefined;

  // 1. Scan for Buy/Sell column
  // A column is Buy/Sell if in the first few data rows (up to 15 rows),
  // the values are non-empty and are always B, S, BUY, SELL, 1, or 2.
  for (let col = 0; col < numCols; col++) {
    let matchesBuySell = true;
    let hasData = false;
    for (let r = 1; r < Math.min(numRows, 15); r++) {
      if (!rows[r] || col >= rows[r].length) continue;
      const val = rows[r][col]?.trim().toUpperCase();
      if (!val) continue; // skip empty cells
      hasData = true;
      if (val !== 'B' && val !== 'S' && val !== 'BUY' && val !== 'SELL' && val !== '1' && val !== '2') {
        matchesBuySell = false;
        break;
      }
    }
    if (hasData && matchesBuySell) {
      buySellIdx = col;
      break;
    }
  }

  // 2. If we found Buy/Sell column, Qty is typically the next column, and Price is the column after that!
  if (buySellIdx !== undefined) {
    const nextCol = buySellIdx + 1;
    if (nextCol < numCols) {
      // Verify if it contains numeric values
      let isNumeric = true;
      for (let r = 1; r < Math.min(numRows, 15); r++) {
        if (!rows[r] || nextCol >= rows[r].length) continue;
        const val = rows[r][nextCol]?.trim();
        if (val && isNaN(Number(val))) {
          isNumeric = false;
          break;
        }
      }
      if (isNumeric) {
        qtyIdx = nextCol;
      }
    }

    if (qtyIdx !== undefined) {
      const nextNextCol = qtyIdx + 1;
      if (nextNextCol < numCols) {
        let isNumeric = true;
        for (let r = 1; r < Math.min(numRows, 15); r++) {
          if (!rows[r] || nextNextCol >= rows[r].length) continue;
          const val = rows[r][nextNextCol]?.trim();
          if (val && isNaN(Number(val))) {
            isNumeric = false;
            break;
          }
        }
        if (isNumeric) {
          priceIdx = nextNextCol;
        }
      }
    }
  }

  return { buySellIdx, qtyIdx, priceIdx };
}

// ─── Row Parser ─────────────────────────────────────────────────

function normalizeDateToDDMMYYYY(dateStr: string, isMMDDYYYY: boolean): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const datePart = trimmed.split(/\s+/)[0];
  const parts = datePart.split(/[-/]/);
  if (parts.length === 3) {
    let [p1, p2, year] = parts;
    if (year.length === 2) year = `20${year}`;
    // If p2 > 12, then p1 is definitely Month and p2 is Day
    const isActuallyMMDD = isMMDDYYYY || parseInt(p2, 10) > 12;
    if (isActuallyMMDD) {
      const mm = p1.padStart(2, '0');
      const dd = p2.padStart(2, '0');
      return `${dd}/${mm}/${year}`;
    } else {
      const dd = p1.padStart(2, '0');
      const mm = p2.padStart(2, '0');
      return `${dd}/${mm}/${year}`;
    }
  }
  return dateStr;
}

function extractDubaiFields(
  fields: string[],
  colMap?: Map<keyof DubaiParsedTrade, number>,
  isMMDDYYYY: boolean = false
): DubaiParsedTrade {
  const g = (fieldKey: keyof DubaiParsedTrade, fallbackIdx: number): string => {
    if (colMap && colMap.has(fieldKey)) {
      const idx = colMap.get(fieldKey)!;
      return idx >= 0 && idx < fields.length ? fields[idx].trim() : '';
    }
    return fallbackIdx >= 0 && fallbackIdx < fields.length ? fields[fallbackIdx].trim() : '';
  };

  const rawCP = g('callPut', 11);
  const rawClient = g('clientCode', 3);

  // Check last column for Real Client Code:
  // If the row has extra trailing columns beyond the standard 28-field header (e.g. index 29 or fields[fields.length - 1]),
  // check if it contains a real client code instead of trade status descriptors ("Normal", "MediumCarry", "Forward", "Spot", etc.).
  const lastColRaw = fields.length > 28 ? fields[fields.length - 1].trim().replace(/^["']|["']$/g, '') : '';
  const standardDescriptors = ['NORMAL', 'MEDIUMCARRY', 'FORWARD', 'SPOT'];
  const hasSwappedClient = lastColRaw !== '' && !standardDescriptors.includes(lastColRaw.toUpperCase());

  const effectiveClientCode = hasSwappedClient ? lastColRaw : rawClient;
  const substituteClientCode = hasSwappedClient ? rawClient : undefined;

  const rawTradeDate = g('tradeDate', 1);
  const rawExpiryDate = g('expiryDate', 9);

  return {
    typeCode:        g('typeCode', 0),
    tradeDate:       normalizeDateToDDMMYYYY(rawTradeDate, isMMDDYYYY),
    tradeTime:       g('tradeTime', 2),
    clientCode:      effectiveClientCode,
    substituteClientCode,
    rawLastCol:      lastColRaw,
    marketCode:      g('marketCode', 4),
    securityCode:    g('securityCode', 5),
    currencyCode:    g('currencyCode', 6),
    securityName:    g('securityName', 7),
    delMonth:        g('delMonth', 8),
    expiryDate:      normalizeDateToDDMMYYYY(rawExpiryDate, isMMDDYYYY),
    marketLot:       g('marketLot', 10),
    callPut:         transformCallPut(rawCP),
    rawCallPut:      rawCP,
    strikePrice:     g('strikePrice', 12),
    tickCode:        g('tickCode', 13),
    bloombergCode:   g('bloombergCode', 14),
    buySellFlag:     transformBuySell(g('buySellFlag', 15)),
    qty:             g('qty', 16),
    price:           g('price', 17),
    mktValue:        g('mktValue', 18),
    statementDate:   g('statementDate', 19),
    clnCommission:   g('clnCommission', 20),
    clnExCharges:    g('clnExCharges', 21),
    clnCharges1:     g('clnCharges1', 22),
    clnCharges2:     g('clnCharges2', 23),
    vat:             g('vat', 24),
    exchOrderId:     g('exchOrderId', 25),
    platformOrderId: g('platformOrderId', 26),
    settlementId:    g('settlementId', 27),
    settlementDate:  g('settlementDate', 28),
    tradeType:       hasSwappedClient ? 'Normal' : (g('tradeType', 29) || 'Normal'),
  };
}

// ─── Validator ──────────────────────────────────────────────────

function validateDubaiRow(trade: DubaiParsedTrade): string | null {
  if (!trade.clientCode && !trade.securityName && !trade.tickCode) return 'Missing trade identifiers';
  if (!trade.buySellFlag) return 'Missing BuySellFlag';
  return null;
}

// ─── CSV Content Splitter with Quoting Support ──────────────────

function parseCsvContent(raw: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Detect delimiter by checking first line
  let delimiter = ',';
  let firstLine = '';
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      firstLine = raw.substring(0, i);
      break;
    }
  }
  if (!firstLine) firstLine = raw;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  delimiter = tabCount > commaCount ? '\t' : ',';

  inQuotes = false;
  const len = raw.length;

  for (let i = 0; i < len; i++) {
    const char = raw[i];

    if (char === '"') {
      if (inQuotes && i + 1 < len && raw[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && i + 1 < len && raw[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentRow.length > 0 || currentField !== '') {
    currentRow.push(currentField);
    if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ─── Main Pipeline ──────────────────────────────────────────────

export function parseDubaiTradeFile(raw: string): DubaiParseResult {
  const trades: DubaiParsedTrade[] = [];
  const errors: ParseError[] = [];

  const rows = parseCsvContent(raw);
  if (rows.length === 0) {
    return {
      trades: [],
      errors: [],
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      debugSampleCsv: '',
      debugSampleLines: [],
    };
  }

  const headerFields = rows[0];
  const colMapMatched = buildColumnIndexMap(headerFields);
  let colMap = colMapMatched;
  if (!colMap) {
    colMap = new Map();
  }

  const heuristics = detectColumnsHeuristically(rows);

  if (!colMap.has('buySellFlag') && heuristics.buySellIdx !== undefined) {
    colMap.set('buySellFlag', heuristics.buySellIdx);
  }
  if (!colMap.has('qty') && heuristics.qtyIdx !== undefined) {
    colMap.set('qty', heuristics.qtyIdx);
  }
  if (!colMap.has('price') && heuristics.priceIdx !== undefined) {
    colMap.set('price', heuristics.priceIdx);
  }

  const debugSampleLinesList: Array<{ row: number; content: string }> = [];
  let skippedOptionsCount = 0;

  const startIndex = colMapMatched ? 1 : 0;



  const isMMDDYYYY = raw.toUpperCase().includes('CUSTCODE') ||
                     raw.toUpperCase().includes('TRADEREFNO') ||
                     raw.toUpperCase().includes('INSTUMENT');

  for (let idx = 0; idx < rows.length; idx++) {
    const rowNum = idx + 1;
    const fields = rows[idx];

    // Reconstruct clean CSV row for debugging
    const rawLine = fields.map(val => {
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(',');

    if (rowNum === 1 || rowNum % 498 === 0 || rowNum % 499 === 0 || rowNum % 500 === 0 || rowNum % 501 === 0) {
      debugSampleLinesList.push({ row: rowNum, content: rawLine });
    }

    if (idx < startIndex) {
      continue;
    }

    const isEmptyRow = fields.every(val => val.trim() === '');
    if (isEmptyRow) {
      continue;
    }

    const trade = extractDubaiFields(fields, colMap, isMMDDYYYY);

    // Filter out Option trades (only import and show Futures)
    const isOption =
      trade.callPut === 'Options' ||
      (trade.rawCallPut && ['P', 'C', 'PE', 'CE', 'PUT', 'CALL'].includes(trade.rawCallPut.trim().toUpperCase())) ||
      (trade.strikePrice && parseFloat(trade.strikePrice) > 0) ||
      (trade.tradeType && trade.tradeType.toUpperCase().includes('EXPIRE'));

    if (isOption) {
      skippedOptionsCount++;
      continue;
    }

    const validationError = validateDubaiRow(trade);

    if (validationError) {
      errors.push({
        row: rowNum,
        rawLine: rawLine.substring(0, 150),
        reason: validationError,
      });
    } else {
      trades.push(trade);
    }
  }

  const debugSampleCsv = debugSampleLinesList
    .map((s) => `[Row ${s.row}] ${s.content}`)
    .join('\n');

  return {
    trades,
    errors,
    totalRows: rows.length,
    successCount: trades.length,
    errorCount: errors.length,
    skippedOptionsCount,
    debugSampleCsv,
    debugSampleLines: debugSampleLinesList,
  };
}
