/**
 * Universal Security Name generator for BizzMate Financial Accounting Software.
 * Standard format: [Script Full Name] [DDMMMYY] [Call/Put] [Strike]
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatExpiryToDDMMMYY(expiry: string | Date | null | undefined): string {
  if (!expiry) return '';
  if (expiry instanceof Date) {
    if (isNaN(expiry.getTime())) return '';
    const day = String(expiry.getUTCDate()).padStart(2, '0');
    const month = MONTHS[expiry.getUTCMonth()];
    const year = String(expiry.getUTCFullYear()).slice(-2);
    return `${day}${month}${year}`;
  }

  const str = String(expiry).trim();
  if (!str) return '';

  // Already in DDMMMYY format, e.g. "28MAY26"
  if (/^\d{1,2}[A-Za-z]{3}\d{2}$/i.test(str)) {
    const match = str.match(/^(\d{1,2})([A-Za-z]{3})(\d{2})$/)!;
    return `${match[1].padStart(2, '0')}${match[2].toUpperCase()}${match[3]}`;
  }

  // DD-MMM-YY or DD-MMM-YYYY or DD/MMM/YY
  const dmyAlpha = str.match(/^(\d{1,2})[-/ ]?([A-Za-z]{3})[-/ ]?(\d{2,4})$/);
  if (dmyAlpha) {
    const day = dmyAlpha[1].padStart(2, '0');
    const month = dmyAlpha[2].toUpperCase();
    const year = dmyAlpha[3].slice(-2);
    return `${day}${month}${year}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (m >= 0 && m < 12) {
      return `${String(d).padStart(2, '0')}${MONTHS[m]}${String(y).slice(-2)}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyNum = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyNum) {
    const d = parseInt(dmyNum[1], 10);
    const m = parseInt(dmyNum[2], 10) - 1;
    let y = parseInt(dmyNum[3], 10);
    if (y < 100) y += 2000;
    if (m >= 0 && m < 12) {
      return `${String(d).padStart(2, '0')}${MONTHS[m]}${String(y).slice(-2)}`;
    }
  }

  return str.toUpperCase();
}

export interface SecurityNameOptions {
  scriptShortName?: string;
  scriptFullName?: string;
  expiry?: string | Date | null;
  expiryDate?: string | Date | null;
  delMonth?: string | null;
  callPut?: string | null;
  strikePrice?: number | string | null;
}

export function generateSecurityName(opts: SecurityNameOptions): string {
  const baseName = (opts.scriptFullName || opts.scriptShortName || '').trim();
  if (!baseName) return '';

  let datePart = '';
  const expVal = opts.expiry || opts.expiryDate;
  if (expVal) {
    datePart = formatExpiryToDDMMMYY(expVal);
  } else if (opts.delMonth) {
    datePart = formatExpiryToDDMMMYY(opts.delMonth);
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
      strikePart = sp.toString();
    }
  }

  return [baseName, datePart, typePart, strikePart].filter(Boolean).join(' ');
}
