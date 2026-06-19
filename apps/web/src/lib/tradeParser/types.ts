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
