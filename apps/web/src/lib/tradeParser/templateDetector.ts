import { apiFetch } from '@/utils/apiClient';

export interface FileImportTemplateOption {
  id: string;
  code: string;
  name: string;
  description?: string;
  importType: 'TRADE' | 'CLOSING_RATE';
  formatType: string;
  signatureHeaders?: string[];
  expectedColCount?: number;
  optionsFilterRule?: any;
  clientSwapRule?: any;
  brokerFeeFormula?: any;
  mappings?: Array<{
    id?: string;
    appField: string;
    fileColumnHeader?: string | null;
    alternateHeaders?: string[];
    isRequired?: boolean;
  }>;
}

// Fallback hardcoded defaults in case database is loading or unreachable
export const DEFAULT_TRADE_TEMPLATES: FileImportTemplateOption[] = [
  {
    id: 'tpl-dubai-trade-default',
    code: 'DUBAI_FNO_TRADE',
    name: 'Dubai Trade F&O CSV',
    description: 'Gulf commodity, currency, and index futures format with trailing client swap and options filter.',
    importType: 'TRADE',
    formatType: 'CSV',
    signatureHeaders: ['TRADETIME', 'EXCHORDERID', 'CLNCOMMISSION', 'MKTVALUE', 'CALLPUT'],
  },
  {
    id: 'tpl-elec-trade-default',
    code: 'ELEC_TRADE',
    name: 'Elec Broker Trade CSV',
    description: 'Elec broker commodities and futures trade format with direct brokerage and TradeRefNo.',
    importType: 'TRADE',
    formatType: 'CSV',
    signatureHeaders: ['CUSTCODE', 'INSTUMENT', 'TRADEREFNO', 'QTY/LOT', 'TRADEPRICE'],
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
    signatureHeaders: ['COMMODITY_CODE', 'CLOSING_PRICE', 'NET_LOTS'],
  },
  {
    id: 'tpl-elec-open-pos-default',
    code: 'ELEC_OPEN_POSITIONS',
    name: 'Elec Broker Open Positions & Closing Rates CSV',
    description: 'Elec broker open positions CSV with SettlPrice and FUTCOM commodity futures.',
    importType: 'CLOSING_RATE',
    formatType: 'CSV',
    signatureHeaders: ['INSTTYPECODE', 'SETTLPRICE', 'UNREALIZEDPNL', 'CONTRACTNAME'],
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
      // If all signature headers are present, strong bonus
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
