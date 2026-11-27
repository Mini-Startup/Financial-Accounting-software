// Universal Dynamic Trade & Closing Rate Parser Module
export { parseTradeFile } from './parser';
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

export {
  parseClosingRatesWithDynamicTemplate,
  parseOpenPositionCSV,
  processClosingRates,
  processOpenPositionClosingRates,
} from './dynamicClosingRateParser';

export {
  validateFileWithTemplate,
  validateTradeImportFile,
  validateClosingRateImportFile,
} from './fileValidator';
export type { FileValidationResult } from './fileValidator';

export {
  detectFileTemplate,
  fetchFileImportTemplates,
  DEFAULT_TRADE_TEMPLATES,
  DEFAULT_CLOSING_RATE_TEMPLATES,
} from './templateDetector';

export type {
  UniversalParsedTrade,
  UniversalParseResult,
  DubaiParsedTrade,
  DubaiParseResult,
  OpenPositionParsedRow,
  ParsedClosingRateItem,
  FileImportTemplateOption,
  FileColumnMappingOption,
  ParseError,
  ParsedTrade,
  ParseResult,
  FieldMapping,
} from './types';
