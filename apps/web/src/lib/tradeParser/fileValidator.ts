/**
 * Pre-Parse File Validation Engine
 * 
 * Inspects raw CSV / Excel content before parser execution to verify:
 * 1. File emptiness and delimiter sanity
 * 2. Cross-file upload detection (e.g. uploading Open Positions into Trade Import)
 * 3. Required column presence and schema compatibility using Database Template Mappings
 */

import type { FileImportTemplateOption } from './types';
import { parseCsvLine, normalizeHeaderKey } from './dynamicTradeParser';
import { detectFileTemplate, DEFAULT_TRADE_TEMPLATES, DEFAULT_CLOSING_RATE_TEMPLATES } from './templateDetector';

export interface FileValidationResult {
  isValid: boolean;
  fileType: 'TRADE_DUBAI' | 'TRADE_STANDARD' | 'TRADE_DYNAMIC' | 'CLOSING_RATE_POSITION' | 'UNKNOWN';
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

function normalizeHeader(h: string): string {
  return h.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/[\s_\-\/]/g, '');
}

function getSanitizedLines(rawContent: string): string[] {
  if (!rawContent || typeof rawContent !== 'string') return [];
  return rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Validates a file against a specific FileImportTemplate (or auto-detected template)
 */
export function validateFileWithTemplate(
  rawContent: string,
  template?: FileImportTemplateOption | null
): FileValidationResult {
  const lines = getSanitizedLines(rawContent);

  if (lines.length === 0) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      totalLines: 0,
      detectedHeaders: [],
      missingHeaders: ['File is empty'],
      errors: ['The uploaded file contains no data rows. Please upload a valid CSV file.'],
      warnings: [],
    };
  }

  const headerRowIdx = template?.headerRowIndex ?? 0;
  const dataStartRow = template?.dataStartRow ?? 1;

  if (lines.length <= dataStartRow) {
    return {
      isValid: false,
      fileType: 'UNKNOWN',
      totalLines: lines.length,
      detectedHeaders: [],
      missingHeaders: ['Data rows'],
      errors: ['The file must contain a header row followed by at least one data row.'],
      warnings: [],
    };
  }

  const delimiter = template?.delimiter || ',';
  const rawHeaders = parseCsvLine(lines[headerRowIdx], delimiter);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  const normalizedKeys = rawHeaders.map(normalizeHeaderKey);

  // Cross-File Mismatch Detection
  const hasClosingRateIndicators =
    normalizedHeaders.includes('netlots') ||
    normalizedHeaders.includes('closingprice') ||
    normalizedHeaders.includes('variancemargin') ||
    normalizedHeaders.includes('settlprice') ||
    normalizedHeaders.includes('unrealizedpnl') ||
    (normalizedHeaders.includes('insttypecode') && (normalizedHeaders.includes('futcom') || normalizedHeaders.includes('optcom') || normalizedHeaders.includes('settlprice'))) ||
    (normalizedHeaders.includes('commoditycode') && normalizedHeaders.includes('openprice'));

  const hasTradeIndicators =
    normalizedHeaders.includes('tradetime') ||
    normalizedHeaders.includes('exchorderid') ||
    normalizedHeaders.includes('traderefno') ||
    normalizedHeaders.includes('clncommission') ||
    normalizedHeaders.includes('mktvalue') ||
    (normalizedHeaders.includes('buysellflag') && normalizedHeaders.includes('price') && normalizedHeaders.includes('qty'));

  const expectedType = template?.importType;

  if (expectedType === 'TRADE' && hasClosingRateIndicators && !hasTradeIndicators) {
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

  if (expectedType === 'CLOSING_RATE' && hasTradeIndicators && !hasClosingRateIndicators) {
    return {
      isValid: false,
      fileType: 'TRADE_DYNAMIC',
      totalLines: lines.length,
      detectedHeaders: rawHeaders,
      missingHeaders: ['Closing Rate Columns'],
      isCrossFileMismatch: true,
      errors: [
        'Wrong File Type Detected: This appears to be a Trade file, not an Open Positions / Closing Rate file.',
        'Columns like TRADETIME, TRADEREFNO, or EXCHORDERID belong to Trade Imports.',
      ],
      warnings: [],
      suggestedAction: {
        message: 'Please import this file on the Trades page using "Import Trades".',
        targetRoute: '/trades?import=true',
      },
    };
  }

  // Dynamic Required Column Validation if template mappings exist
  if (template?.mappings && template.mappings.length > 0) {
    const missing: string[] = [];
    for (const m of template.mappings) {
      if (m.isRequired) {
        let found = false;
        if (m.fileColumnHeader) {
          const normPrimary = normalizeHeaderKey(m.fileColumnHeader);
          if (normalizedKeys.includes(normPrimary)) {
            found = true;
          }
        }
        if (!found && m.alternateHeaders) {
          for (const alt of m.alternateHeaders) {
            const normAlt = normalizeHeaderKey(alt);
            if (normalizedKeys.includes(normAlt)) {
              found = true;
              break;
            }
          }
        }
        if (!found && m.fileColumnIndex !== undefined && m.fileColumnIndex !== null) {
          if (m.fileColumnIndex >= 0 && m.fileColumnIndex < rawHeaders.length) {
            found = true;
          }
        }
        if (!found) {
          missing.push(m.fileColumnHeader || m.appField);
        }
      }
    }

    if (missing.length > 0) {
      return {
        isValid: false,
        fileType: expectedType === 'TRADE' ? 'TRADE_DYNAMIC' : 'CLOSING_RATE_POSITION',
        totalLines: lines.length,
        detectedHeaders: rawHeaders,
        missingHeaders: missing,
        errors: [`Missing required column(s): ${missing.join(', ')}`],
        warnings: [],
      };
    }
  }

  return {
    isValid: true,
    fileType: expectedType === 'TRADE' ? 'TRADE_DYNAMIC' : 'CLOSING_RATE_POSITION',
    totalLines: lines.length,
    detectedHeaders: rawHeaders,
    missingHeaders: [],
    errors: [],
    warnings: lines.length > 5000 ? ['Large file detected (>5,000 rows). Parsing may take a moment.'] : [],
  };
}

/**
 * Validates a file intended for Trade Import
 */
export function validateTradeImportFile(
  rawContent: string,
  selectedTemplate?: FileImportTemplateOption | null
): FileValidationResult {
  const tpl = selectedTemplate || detectFileTemplate(rawContent, DEFAULT_TRADE_TEMPLATES) || DEFAULT_TRADE_TEMPLATES[0];
  return validateFileWithTemplate(rawContent, tpl);
}

/**
 * Validates a file intended for Closing Rate / Open Position import
 */
export function validateClosingRateImportFile(
  rawContent: string,
  selectedTemplate?: FileImportTemplateOption | null
): FileValidationResult {
  const tpl = selectedTemplate || detectFileTemplate(rawContent, DEFAULT_CLOSING_RATE_TEMPLATES) || DEFAULT_CLOSING_RATE_TEMPLATES[0];
  return validateFileWithTemplate(rawContent, tpl);
}
