/**
 * Reusable data table utilities for search filtering, multi-key sorting, and column totals.
 */

export function filterRecordsBySearch<T extends Record<string, any>>(
  records: T[],
  query: string,
  searchKeys?: (keyof T | string)[]
): T[] {
  if (!query || !query.trim()) return records;

  const normalizedQuery = query.toLowerCase().trim();

  return records.filter((record) => {
    if (searchKeys && searchKeys.length > 0) {
      return searchKeys.some((key) => {
        const val = getNestedValue(record, String(key));
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(normalizedQuery);
      });
    }

    // Default: search all string/number fields of the record
    return Object.values(record).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') {
        return Object.values(val).some((nestedVal) => {
          if (nestedVal === null || nestedVal === undefined) return false;
          return String(nestedVal).toLowerCase().includes(normalizedQuery);
        });
      }
      return String(val).toLowerCase().includes(normalizedQuery);
    });
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

export type SortDirection = 'asc' | 'desc' | null;

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

    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }

    // Date check
    const dateA = Date.parse(String(valA));
    const dateB = Date.parse(String(valB));
    if (!isNaN(dateA) && !isNaN(dateB) && typeof valA === 'string' && (valA.includes('-') || valA.includes('/'))) {
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

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
  conditions?: AdvancedCondition[]
): T[] {
  let result = records;

  // 1. Simple search query (by specific column or all columns)
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter((row) => {
      if (searchColumn && searchColumn !== 'ALL') {
        const val = getNestedValue(row, searchColumn);
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      }
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return Object.values(val).some((nestedVal) => {
            if (nestedVal === null || nestedVal === undefined) return false;
            return String(nestedVal).toLowerCase().includes(q);
          });
        }
        return String(val).toLowerCase().includes(q);
      });
    });
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

