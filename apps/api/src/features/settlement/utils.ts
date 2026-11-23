import { generateSecurityName, formatExpiryToDDMMMYY } from '../trades/securityName';

/**
 * Shared utility functions for the settlement module.
 */

export function formatExpiryToSecurityDate(expiry: string | null | undefined): string {
  return formatExpiryToDDMMMYY(expiry);
}

export function normalizeSecurityName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim();
}

/**
 * Derives the canonical security name for a trade, matching the
 * "SCRIPT_FULL_NAME DD-MMM-YY [PUT/CALL] [STRIKE]" convention used universally
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
  const existing = tradeSecurityName ? tradeSecurityName.trim() : '';

  // If trade already has a specific securityName (not just the short or full script name), use it
  if (
    existing &&
    existing.toUpperCase() !== scriptShortName.toUpperCase() &&
    existing.toUpperCase() !== (scriptFullName || '').toUpperCase()
  ) {
    return existing;
  }

  return generateSecurityName({
    scriptFullName: scriptFullName || undefined,
    scriptShortName,
    expiry: expiry || undefined,
    callPut: callPut || undefined,
    strikePrice,
  });
}
