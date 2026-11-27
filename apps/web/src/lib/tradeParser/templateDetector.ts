import { apiFetch } from '@/utils/apiClient';
import type { FileImportTemplateOption } from './types';

export type { FileImportTemplateOption };

// Fallback defaults matching DB seeds in case API is temporarily unavailable
export const DEFAULT_TRADE_TEMPLATES: FileImportTemplateOption[] = [
  {
    id: 'tpl-dubai-trade-default',
    code: 'DUBAI_FNO_TRADE',
    name: 'Dubai Trade F&O CSV',
    description: 'Gulf commodity, currency, and index futures format with trailing client swap and options filter.',
    importType: 'TRADE',
    formatType: 'CSV',
    delimiter: ',',
    hasHeader: true,
    headerRowIndex: 0,
    dataStartRow: 1,
    expectedColCount: 30,
    signatureHeaders: ['TRADETIME', 'EXCHORDERID', 'CLNCOMMISSION', 'MKTVALUE', 'CALLPUT'],
    optionsFilterRule: {
      columnHeader: 'CALLPUT',
      columnIndex: 10,
      excludeValues: ['OPTIONS', 'P', 'C'],
      strikePriceColumnIndex: 12,
    },
    clientSwapRule: {
      columnIndex: 29,
      ignoreValues: ['NORMAL', 'MEDIUMCARRY', 'FORWARD', 'SPOT'],
    },
    brokerFeeFormula: {
      sumHeaders: ['CLNCOMMISSION', 'CLNEXCHARGES', 'CLNCHARGES1', 'CLNCHARGES2'],
    },
    mappings: [
      { appField: 'typeCode', fileColumnHeader: 'TypeCode', fileColumnIndex: 0, isRequired: false },
      { appField: 'tradeDate', fileColumnHeader: 'TradeDate', fileColumnIndex: 1, isRequired: true, transformRule: 'DATE_DD_MMM_YY' },
      { appField: 'tradeTime', fileColumnHeader: 'TradeTime', fileColumnIndex: 2, isRequired: false },
      { appField: 'clientCode', fileColumnHeader: 'ClientCode', fileColumnIndex: 3, isRequired: true },
      { appField: 'marketCode', fileColumnHeader: 'MarketCode', fileColumnIndex: 4, isRequired: true },
      { appField: 'securityCode', fileColumnHeader: 'Security Code', fileColumnIndex: 5, isRequired: false },
      { appField: 'currency', fileColumnHeader: 'Currencycode', fileColumnIndex: 6, isRequired: false },
      { appField: 'securityName', fileColumnHeader: 'SecurityName', fileColumnIndex: 7, isRequired: true },
      { appField: 'delMonth', fileColumnHeader: 'DelMonth', fileColumnIndex: 8, isRequired: false },
      { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', fileColumnIndex: 9, isRequired: false, transformRule: 'DATE_DD_MMM_YY' },
      { appField: 'marketLot', fileColumnHeader: 'MarketLot', fileColumnIndex: 10, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'callPut', fileColumnHeader: 'CallPut', fileColumnIndex: 11, isRequired: false },
      { appField: 'strikePrice', fileColumnHeader: 'StrikePrice', fileColumnIndex: 12, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'tickCode', fileColumnHeader: 'Tickcode', fileColumnIndex: 13, isRequired: true },
      { appField: 'bloombergCode', fileColumnHeader: 'Bloomberg_Code', fileColumnIndex: 14, isRequired: false },
      { appField: 'buySell', fileColumnHeader: 'BuySellFlag', fileColumnIndex: 15, isRequired: true, transformRule: 'BUY_SELL' },
      { appField: 'quantity', fileColumnHeader: 'Qty', fileColumnIndex: 16, isRequired: true, transformRule: 'FLOAT' },
      { appField: 'price', fileColumnHeader: 'Price', fileColumnIndex: 17, isRequired: true, transformRule: 'FLOAT' },
      { appField: 'tradeValue', fileColumnHeader: 'MktValue', fileColumnIndex: 18, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'statementDate', fileColumnHeader: 'StatementDate', fileColumnIndex: 19, isRequired: false },
      { appField: 'clnCommission', fileColumnHeader: 'ClnCommission', fileColumnIndex: 20, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'clnExCharges', fileColumnHeader: 'ClnExCharges', fileColumnIndex: 21, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'clnCharges1', fileColumnHeader: 'ClnCharges1', fileColumnIndex: 22, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'clnCharges2', fileColumnHeader: 'ClnCharges2', fileColumnIndex: 23, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'vat', fileColumnHeader: 'Vat', fileColumnIndex: 24, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'orderId', fileColumnHeader: 'ExchOrderID', fileColumnIndex: 25, isRequired: false },
      { appField: 'platformOrderId', fileColumnHeader: 'Platform_OrderID', fileColumnIndex: 26, isRequired: false },
      { appField: 'settlementId', fileColumnHeader: 'SettlementId', fileColumnIndex: 27, isRequired: false },
      { appField: 'substituteClientCode', fileColumnHeader: null, fileColumnIndex: 29, isRequired: false },
    ],
  },
  {
    id: 'tpl-elec-trade-default',
    code: 'ELEC_TRADE',
    name: 'Elec Broker Trade CSV',
    description: 'Elec broker commodities and futures trade format with direct brokerage and TradeRefNo.',
    importType: 'TRADE',
    formatType: 'CSV',
    delimiter: ',',
    hasHeader: true,
    headerRowIndex: 0,
    dataStartRow: 1,
    expectedColCount: 20,
    signatureHeaders: ['CUSTCODE', 'INSTUMENT', 'TRADEREFNO', 'QTY/LOT', 'TRADEPRICE'],
    optionsFilterRule: {
      columnHeader: 'CallPut',
      columnIndex: 8,
      excludeValues: ['OPTIONS', 'P', 'C'],
      remarksExclude: ['EXPIRE'],
    },
    mappings: [
      { appField: 'clientCode', fileColumnHeader: 'CustCode', fileColumnIndex: 0, isRequired: true },
      { appField: 'exchange', fileColumnHeader: 'Exchange', fileColumnIndex: 1, isRequired: true },
      { appField: 'securityName', fileColumnHeader: 'Instument', fileColumnIndex: 2, isRequired: true },
      { appField: 'tradeDate', fileColumnHeader: 'TradeDate', fileColumnIndex: 3, isRequired: true, transformRule: 'DATE_MM_DD_YYYY' },
      { appField: 'tradeTime', fileColumnHeader: 'TradeTime', fileColumnIndex: 4, isRequired: false },
      { appField: 'orderId', fileColumnHeader: 'TradeRefNo', fileColumnIndex: 5, isRequired: false },
      { appField: 'buySell', fileColumnHeader: 'BuySell', fileColumnIndex: 6, isRequired: true, transformRule: 'BUY_SELL' },
      { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', fileColumnIndex: 7, isRequired: false, transformRule: 'DATE_MM_DD_YYYY' },
      { appField: 'callPut', fileColumnHeader: 'CallPut', fileColumnIndex: 8, isRequired: false },
      { appField: 'strikePrice', fileColumnHeader: 'StrikePrice', fileColumnIndex: 9, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'tickCode', fileColumnHeader: 'ContractCode', fileColumnIndex: 10, isRequired: true },
      { appField: 'quantity', fileColumnHeader: 'Qty/Lot', fileColumnIndex: 11, isRequired: true, transformRule: 'FLOAT' },
      { appField: 'price', fileColumnHeader: 'TradePrice', fileColumnIndex: 12, isRequired: true, transformRule: 'FLOAT' },
      { appField: 'delMonth', fileColumnHeader: 'del_month', fileColumnIndex: 13, isRequired: false },
      { appField: 'marketLot', fileColumnHeader: 'Lot_Size', fileColumnIndex: 14, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'clnCommission', fileColumnHeader: 'BROKERAGE', fileColumnIndex: 15, isRequired: false, transformRule: 'FLOAT' },
    ],
  },
];

export const DEFAULT_CLOSING_RATE_TEMPLATES: FileImportTemplateOption[] = [
  {
    id: 'tpl-broker-open-pos-default',
    code: 'BROKER_OPEN_POSITIONS',
    name: 'Broker Open Positions & Closing Rates CSV',
    description: 'Daily open positions CSV used for closing rates extraction and position reconciliation.',
    importType: 'CLOSING_RATE',
    formatType: 'CSV',
    delimiter: ',',
    hasHeader: true,
    headerRowIndex: 0,
    dataStartRow: 1,
    expectedColCount: 18,
    signatureHeaders: ['COMMODITY_CODE', 'CLOSING_PRICE', 'NET_LOTS'],
    optionsFilterRule: null,
    mappings: [
      { appField: 'clientCode', fileColumnHeader: 'CLIENTCODE', fileColumnIndex: 0, isRequired: false },
      { appField: 'exchange', fileColumnHeader: 'EXCHANGE', fileColumnIndex: 2, isRequired: true },
      { appField: 'commodityCode', fileColumnHeader: 'COMMODITY_CODE', fileColumnIndex: 3, isRequired: true },
      { appField: 'futureOption', fileColumnHeader: 'FUTURE_OPTION', fileColumnIndex: 4, isRequired: false },
      { appField: 'expiryDate', fileColumnHeader: 'EXPIRY_DATE', fileColumnIndex: 5, isRequired: false, transformRule: 'DATE_DD_MMM_YY' },
      { appField: 'callPut', fileColumnHeader: 'CALL_PUT', fileColumnIndex: 6, isRequired: false },
      { appField: 'strikePrice', fileColumnHeader: 'STRIKE_PRICE', fileColumnIndex: 7, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'delMonth', fileColumnHeader: 'DELMONTH', fileColumnIndex: 8, isRequired: false },
      { appField: 'closingPrice', fileColumnHeader: 'CLOSING_PRICE', fileColumnIndex: 9, isRequired: true, transformRule: 'FLOAT' },
      { appField: 'netLots', fileColumnHeader: 'NET_LOTS', fileColumnIndex: 10, isRequired: false, transformRule: 'FLOAT' },
    ],
  },
  {
    id: 'tpl-elec-open-pos-default',
    code: 'ELEC_OPEN_POSITIONS',
    name: 'Elec Broker Open Positions & Closing Rates CSV',
    description: 'Elec broker open positions CSV with SettlPrice and FUTCOM commodity futures.',
    importType: 'CLOSING_RATE',
    formatType: 'CSV',
    delimiter: ',',
    hasHeader: true,
    headerRowIndex: 0,
    dataStartRow: 1,
    expectedColCount: 18,
    signatureHeaders: ['INSTTYPECODE', 'SETTLPRICE', 'UNREALIZEDPNL', 'CONTRACTNAME'],
    optionsFilterRule: {
      columnHeader: 'InstTypeCode',
      columnIndex: 5,
      includeValues: ['FUTCOM'],
      excludeValues: ['OPTCOM'],
    },
    mappings: [
      { appField: 'clientCode', fileColumnHeader: 'CustCode', fileColumnIndex: 0, isRequired: false },
      { appField: 'commodityCode', fileColumnHeader: 'ContractName', fileColumnIndex: 4, isRequired: true },
      { appField: 'futureOption', fileColumnHeader: 'InstTypeCode', fileColumnIndex: 5, isRequired: false },
      { appField: 'expiryDate', fileColumnHeader: 'ExpiryDate', fileColumnIndex: 6, isRequired: false, transformRule: 'DATE_MM_DD_YYYY' },
      { appField: 'strikePrice', fileColumnHeader: 'StrikePrice', fileColumnIndex: 7, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'callPut', fileColumnHeader: 'CallPut', fileColumnIndex: 8, isRequired: false },
      { appField: 'buyLots', fileColumnHeader: 'Buy', fileColumnIndex: 9, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'sellLots', fileColumnHeader: 'Sell', fileColumnIndex: 10, isRequired: false, transformRule: 'FLOAT' },
      { appField: 'closingPrice', fileColumnHeader: 'SettlPrice', fileColumnIndex: 12, isRequired: true, transformRule: 'FLOAT' },
    ],
  },
];

function normalizeHeader(h: string): string {
  return h.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/[\s_\-]/g, '');
}

/**
 * Automatically inspects the first lines of a CSV/text file to match the best FileImportTemplate.
 */
export function detectFileTemplate(
  rawContent: string,
  templates: FileImportTemplateOption[]
): FileImportTemplateOption | null {
  if (!rawContent || !templates || templates.length === 0) return null;

  const firstLine = rawContent.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!firstLine) return null;

  const rawHeaders = firstLine.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  let bestTemplate: FileImportTemplateOption | null = null;
  let highestScore = 0;

  for (const t of templates) {
    let score = 0;
    const signatures = t.signatureHeaders || [];

    if (signatures.length > 0) {
      let matchedSignatures = 0;
      for (const sig of signatures) {
        const normSig = normalizeHeader(sig);
        if (normalizedHeaders.includes(normSig)) {
          matchedSignatures++;
          score += 15;
        }
      }
      if (matchedSignatures === signatures.length) {
        score += 50;
      }
    }

    // Check column mappings if present
    if (t.mappings && t.mappings.length > 0) {
      for (const m of t.mappings) {
        if (m.fileColumnHeader && normalizedHeaders.includes(normalizeHeader(m.fileColumnHeader))) {
          score += 2;
        }
        if (m.alternateHeaders) {
          for (const alt of m.alternateHeaders) {
            if (normalizedHeaders.includes(normalizeHeader(alt))) {
              score += 2;
              break;
            }
          }
        }
      }
    }

    if (score > highestScore && score >= 20) {
      highestScore = score;
      bestTemplate = t;
    }
  }

  return bestTemplate;
}

/**
 * Fetches available templates from API with fallback to defaults.
 */
export async function fetchFileImportTemplates(
  type?: 'TRADE' | 'CLOSING_RATE'
): Promise<FileImportTemplateOption[]> {
  const defaults =
    type === 'TRADE'
      ? DEFAULT_TRADE_TEMPLATES
      : type === 'CLOSING_RATE'
      ? DEFAULT_CLOSING_RATE_TEMPLATES
      : [...DEFAULT_TRADE_TEMPLATES, ...DEFAULT_CLOSING_RATE_TEMPLATES];

  try {
    const query = type ? `?type=${type}` : '';
    const res = await apiFetch(`/file-import-templates${query}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to load file-import-templates from API, using defaults:', err);
  }
  return defaults;
}
