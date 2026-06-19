import type { FieldMapping } from './types';

/**
 * Default field mapping — matches the primary broker CSV format.
 *
 * Example row:
 * 221419,11,FUTSTK,SAMMAANCAP,28APR26,.00,XX,SAMMAANCAP26APRFUT,1,1,011SN13,011,2,4300,154.49,1,011SN13,11074,0,10 Apr 2026 10:12:07,10 Apr 2026 10:12:07,2100000060399446,,10 Apr 2026 10:11:06
 *
 * Index reference:
 *  0  → Trade No (221419)
 *  3  → Script short (SAMMAANCAP)
 *  4  → Expiry (28APR26)
 *  7  → Full Script (SAMMAANCAP26APRFUT)
 * 10  → Client Code (011SN13)
 * 11  → Terminal (011)
 * 12  → Buy/Sell Flag (2 = SELL, 1 = BUY)
 * 13  → Quantity (4300)
 * 14  → Rate (154.49)
 * 17  → Order ID (11074)
 * 19  → Trade Time (10 Apr 2026 10:12:07)
 * 21  → Unique Trade ID (2100000060399446)
 */
export const DEFAULT_MAPPING: FieldMapping = {
  tradeNo: 0,
  script: 3,
  expiry: 4,
  fullScript: 7,
  clientCode: 10,
  terminal: 11,
  buySellFlag: 12,
  qty: 13,
  rate: 14,
  orderId: 17,
  tradeTime: 19,
  uniqueTradeId: 21,
  exchangeTime: 20,
  orderTime: 23,
  instrumentType: 2,
};

// ──────────────────────────────────────────
// Future broker mappings go here:
//
// export const ZERODHA_MAPPING: FieldMapping = { ... };
// export const ANGEL_MAPPING: FieldMapping = { ... };
// ──────────────────────────────────────────
