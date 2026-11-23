/**
 * Reusable data table utilities for search filtering, multi-key sorting, and column totals.
 */

/**
 * Split search query by comma or whitespace, respecting quoted strings e.g. "State Bank" or HDFC, TCS
 */
export function splitSearchTokens(query: string): string[] {
  if (!query || !query.trim()) return [];
  const tokens: string[] = [];
  const regex = /"([^"]+)"|'([^']+)'|([^,\s]+)/g;
  let match;
  while ((match = regex.exec(query)) !== null) {
    const token = match[1] ?? match[2] ?? match[3];
    if (token && token.trim()) {
      tokens.push(token.trim().toLowerCase());
    }
  }
  return tokens;
}

export function filterRecordsBySearch<T extends Record<string, any>>(
  records: T[],
  query: string,
  searchKeys?: (keyof T | string)[]
): T[] {
  if (!query || !query.trim()) return records;

  const tokens = splitSearchTokens(query);
  if (tokens.length === 0) return records;

  return records.filter((record) => {
    if (searchKeys && searchKeys.length > 0) {
      return searchKeys.some((key) => {
        const val = getNestedValue(record, String(key));
        if (val === null || val === undefined) return false;
        const strVal = String(val).toLowerCase();
        return tokens.some((token) => strVal.includes(token));
      });
    }

    // Default: search all string/number fields of the record
    return Object.values(record).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') {
        return Object.values(val).some((nestedVal) => {
          if (nestedVal === null || nestedVal === undefined) return false;
          const strVal = String(nestedVal).toLowerCase();
          return tokens.some((token) => strVal.includes(token));
        });
      }
      const strVal = String(val).toLowerCase();
      return tokens.some((token) => strVal.includes(token));
    });
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

export type SortDirection = 'asc' | 'desc' | null;

/**
 * Algebraic numeric parser that strips currency symbols, commas, spaces, and formatting.
 * Preserves negative numbers and decimals. Returns null if not a parseable number or if input is a date.
 */
export function parseSortableNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    // Exclude date patterns so they fall through to date sorting
    if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(trimmed)) {
      return null;
    }
    // Strip currency symbols ($, ₹, د.إ, etc.), commas, spaces, percentages
    const cleaned = trimmed.replace(/[^0-9.-]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
    const minusCount = (cleaned.match(/-/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (minusCount > 1 || dotCount > 1 || (minusCount === 1 && !cleaned.startsWith('-'))) {
      return null;
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

export function sortRecords<T extends Record<string, any>>(
  records: T[],
  sortKey: keyof T | string | null,
  direction: SortDirection
): T[] {
  if (!sortKey || !direction) return records;

  return [...records].sort((a, b) => {
    const valA = getNestedValue(a, String(sortKey));
    const valB = getNestedValue(b, String(sortKey));

    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return direction === 'asc' ? 1 : -1;
    if (valB === null || valB === undefined) return direction === 'asc' ? -1 : 1;

    // 1. Numeric Comparison (handles raw numbers and currency/formatted strings)
    const numA = parseSortableNumber(valA);
    const numB = parseSortableNumber(valB);
    if (numA !== null && numB !== null) {
      return direction === 'asc' ? numA - numB : numB - numA;
    }

    // 2. Date Comparison
    const dateA = Date.parse(String(valA));
    const dateB = Date.parse(String(valB));
    if (!isNaN(dateA) && !isNaN(dateB) && typeof valA === 'string' && (valA.includes('-') || valA.includes('/'))) {
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

    // 3. String Collation
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });
}

export interface AdvancedCondition {
  id: string;
  column: string;
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'gt' | 'lt';
  value: string;
  conjunction?: 'AND' | 'OR';
}

export function filterRecordsWithAdvanced<T extends Record<string, any>>(
  records: T[],
  searchQuery: string,
  searchColumn: string = 'ALL',
  conditions?: AdvancedCondition[],
  selectedColumns?: string[]
): T[] {
  let result = records;

  // 1. Simple search query with OR tokens (by specific column or all columns)
  if (searchQuery && searchQuery.trim()) {
    const tokens = splitSearchTokens(searchQuery);
    if (tokens.length > 0) {
      result = result.filter((row) => {
        // Multi-column targeting if selectedColumns provided
        if (selectedColumns && selectedColumns.length > 0 && !selectedColumns.includes('ALL')) {
          return selectedColumns.some((colKey) => {
            const val = getNestedValue(row, colKey);
            if (val === null || val === undefined) return false;
            const strVal = String(val).toLowerCase();
            return tokens.some((token) => strVal.includes(token));
          });
        }
        if (searchColumn && searchColumn !== 'ALL') {
          const val = getNestedValue(row, searchColumn);
          if (val === null || val === undefined) return false;
          const strVal = String(val).toLowerCase();
          return tokens.some((token) => strVal.includes(token));
        }
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            return Object.values(val).some((nestedVal) => {
              if (nestedVal === null || nestedVal === undefined) return false;
              const strVal = String(nestedVal).toLowerCase();
              return tokens.some((token) => strVal.includes(token));
            });
          }
          const strVal = String(val).toLowerCase();
          return tokens.some((token) => strVal.includes(token));
        });
      });
    }
  }

  // 2. Advanced conditions (AND / OR)
  if (conditions && conditions.length > 0) {
    const validConditions = conditions.filter((c) => c.value && c.value.trim() !== '');
    if (validConditions.length > 0) {
      result = result.filter((row) => {
        let match = true;
        validConditions.forEach((c, idx) => {
          const rawVal = getNestedValue(row, c.column);
          const valStr = rawVal !== null && rawVal !== undefined ? String(rawVal).toLowerCase() : '';
          const targetStr = c.value.toLowerCase().trim();

          let conditionPassed = false;
          switch (c.operator) {
            case 'equals':
              conditionPassed = valStr === targetStr;
              break;
            case 'starts_with':
              conditionPassed = valStr.startsWith(targetStr);
              break;
            case 'ends_with':
              conditionPassed = valStr.endsWith(targetStr);
              break;
            case 'gt':
              conditionPassed = Number(rawVal) > Number(c.value);
              break;
            case 'lt':
              conditionPassed = Number(rawVal) < Number(c.value);
              break;
            case 'contains':
            default:
              conditionPassed = valStr.includes(targetStr);
              break;
          }

          if (idx === 0) {
            match = conditionPassed;
          } else {
            const conj = c.conjunction || 'AND';
            if (conj === 'OR') {
              match = match || conditionPassed;
            } else {
              match = match && conditionPassed;
            }
          }
        });
        return match;
      });
    }
  }

  return result;
}

export function replaceValueInRecords<T extends Record<string, any>>(
  records: T[],
  targetColumn: string,
  findValue: string,
  replaceValue: string,
  replaceAll: boolean = true,
  targetRowIndex?: number
): { updatedRecords: T[]; count: number } {
  if (!findValue || !targetColumn) return { updatedRecords: records, count: 0 };

  const query = findValue.toLowerCase();
  let count = 0;

  const updatedRecords = records.map((item, idx) => {
    if (!replaceAll && targetRowIndex !== undefined && idx !== targetRowIndex) {
      return item;
    }

    const currentVal = getNestedValue(item, targetColumn);
    if (currentVal !== null && currentVal !== undefined) {
      const strVal = String(currentVal);
      if (strVal.toLowerCase().includes(query)) {
        // Case-preserving or exact regex replace
        const regex = new RegExp(escapeRegExp(findValue), 'gi');
        const newVal = strVal.replace(regex, replaceValue);
        count++;
        return {
          ...item,
          [targetColumn]: typeof currentVal === 'number' ? (isNaN(Number(newVal)) ? newVal : Number(newVal)) : newVal,
        };
      }
    }
    return item;
  });

  return { updatedRecords, count };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function calculateColumnTotals<T extends Record<string, any>>(
  records: T[],
  numericKeys: (keyof T | string)[]
): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const key of numericKeys) {
    const keyStr = String(key);
    totals[keyStr] = records.reduce((sum, item) => {
      const val = parseFloat(getNestedValue(item, keyStr));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }

  return totals;
}

