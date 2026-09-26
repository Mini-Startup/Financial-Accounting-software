/**
 * Shared utility functions for the settlement module.
 */

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Converts an expiry date string (e.g. "2026-12-29", "28/07/2026", "28-APR-2026")
 * into the human-readable "DD MMM YYYY" format (e.g. "29 DEC 2026") that matches
 * the security name pattern used by trade imports and closing rates.
 */
export function formatExpiryToSecurityDate(expiry: string | null | undefined): string {
  if (!expiry) return '';
  const trimmed = expiry.trim();

  // Already in "DD MMM YYYY" or similar format? Return as-is uppercase.
  if (/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10).toString().padStart(2, '0');
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const monthIdx = parseInt(dmyMatch[2], 10) - 1;
    const year = dmyMatch[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
    }
  }

  // Check DD-MMM-YY or DD-MMM-YYYY or DDMMMYY (e.g. 28APR26, 28-APR-2026)
  const mmmMatch = trimmed.match(/^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2}|\d{4})$/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const mStr = mmmMatch[2].toUpperCase();
    let y = parseInt(mmmMatch[3], 10);
    const yearStr = y < 100 ? (2000 + y).toString() : y.toString();
    return `${day} ${mStr} ${yearStr}`;
  }

  // Unrecognised format — return trimmed uppercase
  return trimmed.toUpperCase();
}

/**
 * Normalizes any embedded ISO or DMY date strings within an existing securityName
 * to universal "DD MMM YYYY" format.
 * (e.g. "GOLD 2026-12-29" -> "GOLD 29 DEC 2026")
 */
export function normalizeSecurityName(name: string | null | undefined): string {
  if (!name) return '';
  let cleaned = name.trim();

  // Replace YYYY-MM-DD with DD MMM YYYY
  cleaned = cleaned.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_m, y, m, d) => {
    const mIdx = parseInt(m, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${d.padStart(2, '0')} ${MONTH_NAMES[mIdx]} ${y}`;
    }
    return _m;
  });

  // Replace DD-MM-YYYY with DD MMM YYYY
  cleaned = cleaned.replace(/\b(\d{2})-(\d{2})-(\d{4})\b/g, (_m, d, m, y) => {
    const mIdx = parseInt(m, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${d} ${MONTH_NAMES[mIdx]} ${y}`;
    }
    return _m;
  });

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Derives the canonical security name for a trade, matching the
 * "SCRIPT_FULL_NAME DD MMM YYYY [PUT/CALL] [STRIKE]" convention used universally
 * across trade imports and closing rates.
 */
export function deriveSecurityName(
  tradeSecurityName: string | null | undefined,
  scriptShortName: string,
  scriptFullName: string | null | undefined,
  expiry: string | null | undefined,
  callPut?: string | null,
  strikePrice?: number | string | null
): string {
  const existing = tradeSecurityName ? normalizeSecurityName(tradeSecurityName) : '';
  const base = (scriptFullName || scriptShortName || '').trim();

  // If trade already has a specific securityName (not just the short or full script name), use it
  if (
    existing &&
    existing.toUpperCase() !== scriptShortName.toUpperCase() &&
    existing.toUpperCase() !== (scriptFullName || '').toUpperCase()
  ) {
    return existing;
  }

  const datePart = formatExpiryToSecurityDate(expiry);

  let typePart = '';
  if (callPut) {
    const cp = callPut.trim().toUpperCase();
    if (cp === 'P' || cp === 'PUT' || cp.includes('PUT')) typePart = 'PUT';
    else if (cp === 'C' || cp === 'CALL' || cp.includes('CALL')) typePart = 'CALL';
  }

  let strikePart = '';
  if (strikePrice != null && String(strikePrice).trim() !== '') {
    const sp = parseFloat(String(strikePrice));
    if (!isNaN(sp) && sp > 0) {
      strikePart = sp % 1 === 0 ? sp.toString() : sp.toFixed(2);
    }
  }

  return [base, datePart, typePart, strikePart].filter(Boolean).join(' ');
}
