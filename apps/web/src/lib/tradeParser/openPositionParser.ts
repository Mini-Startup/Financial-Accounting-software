/**
 * Re-exporting from dynamicClosingRateParser for backward compatibility.
 * Prefer importing from '@/lib/tradeParser' or './dynamicClosingRateParser'.
 */
export {
  parseClosingRatesWithDynamicTemplate,
  parseOpenPositionCSV,
  processClosingRates,
  processOpenPositionClosingRates,
} from './dynamicClosingRateParser';

export type {
  OpenPositionParsedRow,
  ParsedClosingRateItem,
} from './types';
