/**
 * Universal Security Name generator for BizzMate Financial Accounting Software.
 * Standard format: <SCRIPT_NAME> <DD MMM YYYY> [PUT/CALL] [STRIKE]
 */

import { formatDateToSecurityDate } from './dateUtils';

export interface SecurityNameOptions {
  scriptShortName?: string;
  scriptFullName?: string;
  expiry?: string | Date | null;
  delMonth?: string | null;
  callPut?: string | null;
  strikePrice?: number | string | null;
}

export function generateSecurityName(opts: SecurityNameOptions): string {
  const baseName = (opts.scriptFullName || opts.scriptShortName || '').trim();
  if (!baseName) return '';

  let datePart = '';
  if (opts.expiry) {
    datePart = formatDateToSecurityDate(opts.expiry);
  } else if (opts.delMonth) {
    datePart = opts.delMonth.trim().toUpperCase();
  }

  let typePart = '';
  if (opts.callPut) {
    const cp = opts.callPut.trim().toUpperCase();
    if (cp === 'P' || cp === 'PE' || cp === 'PUT' || cp.includes('PUT')) {
      typePart = 'PUT';
    } else if (cp === 'C' || cp === 'CE' || cp === 'CALL' || cp.includes('CALL')) {
      typePart = 'CALL';
    }
  }

  let strikePart = '';
  if (opts.strikePrice != null && String(opts.strikePrice).trim() !== '') {
    const sp = parseFloat(String(opts.strikePrice));
    if (!isNaN(sp) && sp > 0) {
      strikePart = sp % 1 === 0 ? sp.toString() : sp.toFixed(2);
    }
  }

  return [baseName, datePart, typePart, strikePart].filter(Boolean).join(' ');
}
