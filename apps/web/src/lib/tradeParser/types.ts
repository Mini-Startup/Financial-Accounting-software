/**
 * Trade Parser — Type Definitions
 *
 * Structured types for the parse → transform → validate → normalize pipeline.
 * FieldMapping is intentionally configurable to support multiple broker formats.
 */

/** Normalized trade object — the output of the pipeline */
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

/** Error captured during parsing — one per problematic row */
export interface ParseError {
  row: number;
  rawLine: string;
  reason: string;
}

/** Result of parsing an entire file */
export interface ParseResult {
  trades: ParsedTrade[];
  errors: ParseError[];
  totalRows: number;
  successCount: number;
  errorCount: number;
}

/**
 * Configurable field mapping — index positions for each field in a CSV row.
 * Different brokers may use different column orders.
 */
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

// ─────────────────────────────────────────────
// DUBAI TRADE FnO — 30-field format
// ─────────────────────────────────────────────

/** Parsed row from a Dubai Trade FnO file — all 30 fields */
export interface DubaiParsedTrade {
  typeCode: string;
  tradeDate: string;
  tradeTime: string;
  clientCode: string;
  marketCode: string;       // acts as exchange
  securityCode: string;
  currencyCode: string;
  securityName: string;
  delMonth: string;
  expiryDate: string;
  marketLot: string;
  callPut: string;          // transformed: "" → "Future", "P" → "Options"
  rawCallPut?: string;      // raw CallPut field from file e.g. "P", "C", ""
  strikePrice: string;
  tickCode: string;
  bloombergCode: string;
  buySellFlag: string;      // transformed: "B" → "Buy", "S" → "Sell"
  qty: string;
  price: string;
  mktValue: string;
  statementDate: string;
  clnCommission: string;
  clnExCharges: string;
  clnCharges1: string;
  clnCharges2: string;
  vat: string;
  exchOrderId: string;
  platformOrderId: string;
  settlementId: string;
  settlementDate: string;
  tradeType: string;        // TradeType / CarryType
  selected?: boolean;
}

/** Result of parsing a Dubai Trade FnO file */
export interface DubaiParseResult {
  trades: DubaiParsedTrade[];
  errors: ParseError[];
  totalRows: number;
  successCount: number;
  errorCount: number;
  debugSampleCsv?: string;
  debugSampleLines?: Array<{ row: number; content: string }>;
}

