/**
 * Pre-Parse File Validation Engine
 * 
 * Inspects raw CSV / Excel content before parser execution to verify:
 * 1. File emptiness and delimiter sanity
 * 2. Cross-file upload detection (e.g. uploading Open Positions into Trade Import)
 * 3. Required column presence and schema compatibility
 */

export interface FileValidationResult {
  isValid: boolean;
  fileType: 'TRADE_DUBAI' | 'TRADE_STANDARD' | 'CLOSING_RATE_POSITION' | 'UNKNOWN';
  totalLines: number;
  detectedHeaders: string[];
  missingHeaders: string[];
  errors: string[];
  warnings: string[];
  isCrossFileMismatch?: boolean;
  suggestedAction?: {
    message: string;
    targetRoute: string;
  };
}

/**
 * Normalizes header string: strips outer quotes, converts to lowercase, removes underscores and spaces
 */
function normalizeHeader(h: string): string {
  return h.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/[\s_\-\/]/g, '');
}

/**
 * Splits raw content into non-empty rows safely
 */
function getSanitizedLines(rawContent: string): string[] {
  if (!rawContent || typeof rawContent !== 'string') return [];
  return rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Validates a file intended for Trade Import (Dubai FNO format or Standard Indian Broker CSV)
 */
export function validateTradeImportFile(rawContent: string): FileValidationResult {
  const lines = getSanitizedLines(rawContent);

  if (lines.length === 0) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      totalLines: 0,
      detectedHeaders: [],
      missingHeaders: ['File is empty'],
      errors: ['The uploaded file contains no data rows. Please upload a valid CSV or Excel trade file.'],
      warnings: [],
    };
  }

  if (lines.length < 2) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      totalLines: lines.length,
      detectedHeaders: [],
      missingHeaders: ['Data rows'],
      errors: ['The file must contain a header row followed by at least one trade transaction row.'],
      warnings: [],
    };
  }

  // Parse header row
  const headerLine = lines[0];
  const rawHeaders = headerLine.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // ── 1. Check Cross-File Mismatch: Is this an Open Positions / Closing Rate file? ──
  const isClosingRateFile =
    normalizedHeaders.includes('netlots') ||
    normalizedHeaders.includes('closingprice') ||
    normalizedHeaders.includes('variancemargin') ||
    normalizedHeaders.includes('settlprice') ||
    normalizedHeaders.includes('unrealizedpnl') ||
    (normalizedHeaders.includes('insttypecode') && (normalizedHeaders.includes('futcom') || normalizedHeaders.includes('optcom') || normalizedHeaders.includes('settlprice'))) ||
    (normalizedHeaders.includes('commoditycode') && normalizedHeaders.includes('openprice'));

  if (isClosingRateFile) {
    return {
      isValid: false,
      fileType: 'CLOSING_RATE_POSITION',
      totalLines: lines.length,
      detectedHeaders: rawHeaders,
      missingHeaders: ['Trade Columns'],
      isCrossFileMismatch: true,
      errors: [
        'Wrong File Type Detected: This appears to be an Open Positions / Closing Rate file, not a Trade file.',
        'Columns like NET_LOTS, SETTLPRICE, VARIANCE_MARGIN, or CLOSING_PRICE belong to Closing Rates.',
      ],
      warnings: [],
      suggestedAction: {
        message: 'Please import this file on the Closing Rates page using "Import Position File".',
        targetRoute: '/closing-rates?import=true',
      },
    };
  }

  // ── 2. Check Dubai / ELEC Trade FNO Schema ──
  const hasClientCode = normalizedHeaders.some((h) =>
    ['clientcode', 'client', 'clncode', 'accountcode', 'partycode', 'custcode'].includes(h)
  );
  const hasBuySell = normalizedHeaders.some((h) =>
    ['buysellflag', 'buysell', 'side', 'bs', 'transactiontype'].includes(h)
  );
  const hasPrice = normalizedHeaders.some((h) =>
    ['price', 'rate', 'tradeprice', 'mktprice'].includes(h)
  );
  const hasQty = normalizedHeaders.some((h) =>
    ['qty', 'quantity', 'lots', 'volume', 'qtylot', 'qty/lot'].includes(h)
  );
  const hasSecurityOrScript = normalizedHeaders.some((h) =>
    ['securityname', 'tickcode', 'commodity', 'script', 'symbol', 'securitycode', 'contractcode', 'instument', 'instrument'].includes(h)
  );

  const missingDubai: string[] = [];
  if (!hasClientCode) missingDubai.push('Client Code (ClientCode / Client)');
  if (!hasBuySell) missingDubai.push('Buy/Sell Flag (BuySellFlag / BuySell / Side)');
  if (!hasPrice) missingDubai.push('Price / Rate (Price / Rate)');
  if (!hasQty) missingDubai.push('Quantity (Qty / Quantity)');
  if (!hasSecurityOrScript) missingDubai.push('Security / Script (SecurityName / Tickcode / Commodity)');

  if (missingDubai.length === 0) {
    return {
      isValid: true,
      fileType: 'TRADE_DUBAI',
      totalLines: lines.length,
      detectedHeaders: rawHeaders,
      missingHeaders: [],
      errors: [],
      warnings: lines.length > 5000 ? ['Large file detected (>5,000 rows). Parsing may take a few seconds.'] : [],
    };
  }

  // ── 3. Check Standard Broker CSV Format (Headerless or 15+ positional columns) ──
  const firstDataRow = lines[1].split(',');
  if (firstDataRow.length >= 15) {
    const flagVal = firstDataRow[12]?.trim();
    const qtyVal = Number(firstDataRow[13]?.trim());
    const rateVal = Number(firstDataRow[14]?.trim());
    if ((flagVal === '1' || flagVal === '2') && !isNaN(qtyVal) && !isNaN(rateVal)) {
      return {
        isValid: true,
        fileType: 'TRADE_STANDARD',
        totalLines: lines.length,
        detectedHeaders: rawHeaders,
        missingHeaders: [],
        errors: [],
        warnings: [],
      };
    }
  }

  // ── 4. Neither format matched: return explicit schema error ──
  return {
    isValid: false,
    fileType: 'UNKNOWN',
    totalLines: lines.length,
    detectedHeaders: rawHeaders,
    missingHeaders: missingDubai,
    errors: [
      `File format does not match recognized Trade schemas.`,
      `Missing required columns: ${missingDubai.join(', ')}.`,
      `Found ${rawHeaders.length} columns: ${rawHeaders.slice(0, 8).join(', ')}${rawHeaders.length > 8 ? '...' : ''}.`,
    ],
    warnings: [],
  };
}

/**
 * Validates a file intended for Closing Rates / Open Position Import
 */
export function validateClosingRateImportFile(rawContent: string): FileValidationResult {
  const lines = getSanitizedLines(rawContent);

  if (lines.length === 0) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      totalLines: 0,
      detectedHeaders: [],
      missingHeaders: ['File is empty'],
      errors: ['The uploaded file contains no data rows. Please upload a valid Open Positions CSV.'],
      warnings: [],
    };
  }

  if (lines.length < 2) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      totalLines: lines.length,
      detectedHeaders: [],
      missingHeaders: ['Data rows'],
      errors: ['The file must contain a header row followed by position rows.'],
      warnings: [],
    };
  }

  const headerLine = lines[0];
  const rawHeaders = headerLine.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // ── 1. Check Cross-File Mismatch: Is this a Trade file? ──
  const isTradeFile =
    normalizedHeaders.includes('tradetime') ||
    normalizedHeaders.includes('exchorderid') ||
    normalizedHeaders.includes('traderefno') ||
    normalizedHeaders.includes('clncommission') ||
    normalizedHeaders.includes('mktvalue') ||
    (normalizedHeaders.includes('typecode') && normalizedHeaders.includes('buysellflag')) ||
    (normalizedHeaders.includes('custcode') && normalizedHeaders.includes('qtylot') && normalizedHeaders.includes('tradeprice'));

  if (isTradeFile) {
    return {
      isValid: false,
      fileType: 'TRADE_DUBAI',
      totalLines: lines.length,
      detectedHeaders: rawHeaders,
      missingHeaders: ['Closing Rate Columns'],
      isCrossFileMismatch: true,
      errors: [
        'Wrong File Type Detected: This appears to be a Trade file, not an Open Positions file.',
        'Columns like TRADETIME, TRADEREFNO, EXCHORDERID, or CLNCOMMISSION belong to Trades.',
      ],
      warnings: [],
      suggestedAction: {
        message: 'Please import this file on the Trades page using "Import Trades".',
        targetRoute: '/trades?import=true',
      },
    };
  }

  // ── 2. Check Required Open Position Headers ──
  const hasExchange = normalizedHeaders.some((h) =>
    ['exchange', 'market', 'exch', 'marketcode'].includes(h)
  );
  const hasCommodity = normalizedHeaders.some((h) =>
    ['commoditycode', 'commodity', 'tickcode', 'script', 'security', 'contractcode'].includes(h)
  );
  const hasClosingPrice = normalizedHeaders.some((h) =>
    ['closingprice', 'closeprice', 'closingrate', 'rate', 'price', 'settlprice', 'settlementprice'].includes(h)
  );

  const missingColumns: string[] = [];
  if (!hasExchange) missingColumns.push('Exchange (EXCHANGE / MARKET)');
  if (!hasCommodity) missingColumns.push('Commodity Code (COMMODITY_CODE / COMMODITY / TICKCODE)');
  if (!hasClosingPrice) missingColumns.push('Closing Price (CLOSING_PRICE / PRICE / RATE)');

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      totalLines: lines.length,
      detectedHeaders: rawHeaders,
      missingHeaders: missingColumns,
      errors: [
        'File format does not match the Open Position / Closing Rate schema.',
        `Missing required columns: ${missingColumns.join(', ')}.`,
        `Found ${rawHeaders.length} columns: ${rawHeaders.slice(0, 8).join(', ')}${rawHeaders.length > 8 ? '...' : ''}.`,
      ],
      warnings: [],
    };
  }

  return {
    isValid: true,
    fileType: 'CLOSING_RATE_POSITION',
    totalLines: lines.length,
    detectedHeaders: rawHeaders,
    missingHeaders: [],
    errors: [],
    warnings: [],
  };
}
