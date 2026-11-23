/**
 * Trade & Closing Rate Parser — Type Definitions
 *
 * Generic, data-driven types supporting any broker / exchange format
 * configured in the database via FileImportTemplate and FileColumnMapping.
 */

/** Normalized trade object — standard output across all trade formats */
export interface UniversalParsedTrade {
  typeCode: string;
  tradeDate: string;        // Normalized DD/MM/YYYY
  tradeTime: string;
  clientCode: string;
  substituteClientCode?: string;
  rawLastCol?: string;
  marketCode: string;       // Exchange or Market
  securityCode: string;
  currencyCode: string;
  securityName: string;
  delMonth: string;
  expiryDate: string;       // Normalized DD/MM/YYYY
  marketLot: string;
  callPut: string;          // e.g. "Future", "Options"
  rawCallPut?: string;
  strikePrice: string;
  tickCode: string;         // Symbol or Contract code
  bloombergCode: string;
  buySellFlag: string;      // Normalized "Buy" or "Sell"
  qty: string;              // Number of lots
  price: string;            // Price / Rate per unit
  mktValue: string;         // Calculated trade value: qty * price * marketLot
  statementDate: string;
  clnCommission: string;    // Brokerage fee
  clnExCharges: string;
  clnCharges1: string;
  clnCharges2: string;
  vat: string;
  exchOrderId: string;
  platformOrderId: string;
  settlementId: string;
  settlementDate: string;
  tradeType: string;        // Carry type / trade descriptor
  selected?: boolean;
}

/** Backward-compatible alias */
export type DubaiParsedTrade = UniversalParsedTrade;

export interface ParsedTrade {
  tradeNo: string;
  script: string;
  fullScript: string;
  expiry: string;
  clientCode: string;
  terminal: string;
  type: 'BUY' | 'SELL';
  qty: number;
  rate: number;
  tradeTime: string;
  orderId: string;
  uniqueTradeId: string;
  exchangeTime: string;
  orderTime: string;
  instrumentType?: string;
  selected?: boolean;
}

export interface ParseResult {
  trades: ParsedTrade[];
  errors: ParseError[];
  totalRows: number;
  successCount: number;
  errorCount: number;
}

export interface FieldMapping {
  tradeNo: number;
  script: number;
  expiry: number;
  fullScript: number;
  clientCode: number;
  terminal: number;
  buySellFlag: number;
  qty: number;
  rate: number;
  orderId: number;
  tradeTime: number;
  uniqueTradeId: number;
  exchangeTime: number;
  orderTime: number;
  instrumentType: number;
}

/** Error captured during parsing */
export interface ParseError {
  row: number;
  rawLine: string;
  reason: string;
}

/** Result of parsing an entire file */
export interface UniversalParseResult {
  trades: UniversalParsedTrade[];
  errors: ParseError[];
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedOptionsCount?: number;
  templateCode?: string;
  templateName?: string;
  debugSampleCsv?: string;
  debugSampleLines?: Array<{ row: number; content: string }>;
}

/** Backward-compatible alias */
export type DubaiParseResult = UniversalParseResult;

/**
 * Open Position / Closing Rate parsed row — standard output across all open position formats
 */
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
  securityName: string;
  resolvedExchangeId?: string;
  resolvedScriptId?: string;
  scriptFullName?: string;
  status: 'Valid' | 'Unmapped';
  errors: string[];
}

/** File Import Template structure retrieved from DB or defaults */
export interface FileColumnMappingOption {
  id?: string;
  appField: string;
  fileColumnHeader?: string | null;
  fileColumnIndex?: number | null;
  alternateHeaders?: string[];
  isRequired?: boolean;
  defaultValue?: string | null;
  transformRule?: string | null;
}

export interface FileImportTemplateOption {
  id: string;
  code: string;
  name: string;
  description?: string;
  importType: 'TRADE' | 'CLOSING_RATE';
  formatType: string;
  delimiter?: string;
  hasHeader?: boolean;
  headerRowIndex?: number;
  dataStartRow?: number;
  expectedColCount?: number;
  signatureHeaders?: string[];
  optionsFilterRule?: {
    columnHeader?: string;
    columnIndex?: number;
    excludeValues?: string[];
    includeValues?: string[];
    strikePriceColumnIndex?: number;
    strikePriceHeader?: string;
    remarksExclude?: string[];
  } | null;
  clientSwapRule?: {
    columnIndex?: number;
    columnHeader?: string;
    ignoreValues?: string[];
  } | null;
  brokerFeeFormula?: {
    sumHeaders?: string[];
  } | null;
  mappings?: FileColumnMappingOption[];
}
