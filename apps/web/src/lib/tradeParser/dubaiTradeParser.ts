/**
 * Re-exporting from dynamicTradeParser for backward compatibility.
 * Prefer importing from '@/lib/tradeParser' or './dynamicTradeParser'.
 */
export {
  parseTradesWithDynamicTemplate,
  parseDubaiTradeFile,
  parseCsvLine,
  normalizeHeaderKey,
  normalizeDateToDDMMYYYY,
  transformBuySell,
  transformCallPut,
  parseNumeric,
  resolveTemplateColumnBindings,
} from './dynamicTradeParser';

export type {
  UniversalParsedTrade,
  UniversalParseResult,
  DubaiParsedTrade,
  DubaiParseResult,
} from './types';
