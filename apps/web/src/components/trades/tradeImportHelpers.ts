// Helper to convert normalized datetime string (e.g. "2026-04-10 15:11:56") 
// to input datetime-local format "2026-04-10T15:11:56"
export function formatDateTimeForInput(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '';
  const cleaned = dateTimeStr.trim();
  if (cleaned.includes('T')) {
    return cleaned;
  }
  return cleaned.replace(' ', 'T');
}

// Helper to convert input datetime-local value (e.g. "2026-04-10T15:11:56")
// back to normalized datetime string "2026-04-10 15:11:56"
export function parseDateTimeFromInput(value: string): string {
  if (!value) return '';
  let cleaned = value.trim().replace('T', ' ');
  if (cleaned.length === 16) { // YYYY-MM-DD HH:MM
    cleaned += ':00';
  }
  return cleaned;
}

// Helper to convert different expiry string formats to "YYYY-MM-DD"
// so that the HTML date picker can display it.
export function formatExpiryForInput(expiryStr: string | null | undefined): string {
  if (!expiryStr) return '';
  const cleaned = expiryStr.trim();
  if (!cleaned) return '';

  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Check YYYY/MM/DD
  const ymdSlash = cleaned.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymdSlash) {
    return `${ymdSlash[1]}-${ymdSlash[2]}-${ymdSlash[3]}`;
  }

  // Check DD-MMM-YY or DD-MMM-YYYY or DDMMMYY (e.g. 28APR26, 28-APR-26, 28-APR-2026)
  const regex = /^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2}|\d{4})$/;
  const match = cleaned.match(regex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = match[2].toUpperCase();
    const yearStr = match[3];
    let year = parseInt(yearStr, 10);
    if (yearStr.length === 2) {
      year += 2000;
    }
    
    const months: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };
    if (monthStr in months) {
      return `${year}-${months[monthStr]}-${day}`;
    }
  }

  // Fallback to native Date parsing if possible
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

import type { DubaiParsedTrade } from '../../lib/tradeParser';

export function generateDubaiSecurityName(
  row: DubaiParsedTrade,
  scriptObj?: { fullName?: string; shortName?: string }
): string | null {
  if (!scriptObj) return null;
  const baseName = (scriptObj.fullName || scriptObj.shortName || '').trim();
  if (!baseName) return null;

  let dayStr = '';
  let monthStr = '';
  let yearStr = '';

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // 1. Try parsing expiryDate first (e.g. "30-06-2026 00:00" or "2026-06-30" or "28/07/2026" or "28-APR-2026")
  if (row.expiryDate) {
    const cleaned = row.expiryDate.trim().split(' ')[0];
    
    // Check DD-MMM-YY or DD-MMM-YYYY or DDMMMYY (e.g. 28APR26, 28-APR-2026)
    const mmmMatch = cleaned.match(/^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2}|\d{4})$/);
    if (mmmMatch) {
      dayStr = mmmMatch[1].padStart(2, '0');
      monthStr = mmmMatch[2].toUpperCase();
      const y = parseInt(mmmMatch[3], 10);
      yearStr = y < 100 ? (2000 + y).toString() : y.toString();
    } else {
      const parts = cleaned.split(/[-/]/);
      if (parts.length === 3) {
        let d = 0, m = 0, y = 0;
        if (parts[0].length === 4) { // YYYY-MM-DD
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        } else { // DD-MM-YYYY
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          y = parseInt(parts[2], 10);
        }
        if (!isNaN(d) && d >= 1 && d <= 31) dayStr = String(d).padStart(2, '0');
        if (!isNaN(m) && m >= 1 && m <= 12) monthStr = monthNames[m - 1];
        if (!isNaN(y)) yearStr = y < 100 ? (2000 + y).toString() : y.toString();
      }
    }
  }

  // 2. Fallback delMonth if date parts missing e.g. "Jun-26"
  if ((!monthStr || !yearStr) && row.delMonth) {
    const dmParts = row.delMonth.trim().split(/[-/\s]+/);
    if (dmParts.length >= 2) {
      monthStr = dmParts[0].toUpperCase();
      const y = parseInt(dmParts[1], 10);
      if (!isNaN(y)) {
        yearStr = y < 100 ? (2000 + y).toString() : y.toString();
      }
    }
  }

  const datePart = [dayStr, monthStr, yearStr].filter(Boolean).join(' ');

  // 3. Option type & Strike price
  const cpRaw = (row.rawCallPut || row.callPut || '').trim().toUpperCase();
  let typePart = '';
  if (cpRaw === 'P' || cpRaw === 'PUT' || cpRaw.includes('PUT')) {
    typePart = 'PUT';
  } else if (cpRaw === 'C' || cpRaw === 'CALL' || cpRaw.includes('CALL')) {
    typePart = 'CALL';
  }

  const strikeVal = row.strikePrice ? parseFloat(row.strikePrice) : 0;
  const strikePart = (strikeVal > 0) ? `${row.strikePrice}` : '';

  if (strikeVal > 0 && !typePart) {
    if (cpRaw.includes('P')) typePart = 'PUT';
    else if (cpRaw.includes('C')) typePart = 'CALL';
  }

  const parts = [baseName, datePart, typePart, strikePart].filter(Boolean);
  return parts.join(' ');
}

export function checkExpiryDelMonthMismatch(expiryDateStr?: string, delMonthStr?: string): boolean {
  if (!expiryDateStr || !delMonthStr) return false;
  
  const dmParts = delMonthStr.trim().split(/[-/\s]+/);
  if (dmParts.length < 2) return false;

  const delMonthName = dmParts[0].toUpperCase(); // e.g. "JUN"
  let delYear = parseInt(dmParts[1], 10);
  if (delYear < 100) delYear += 2000;

  const expiryNorm = formatExpiryForInput(expiryDateStr); // YYYY-MM-DD
  if (!expiryNorm) return false;

  const expParts = expiryNorm.split('-');
  const expYear = parseInt(expParts[0], 10);
  const expMonthIdx = parseInt(expParts[1], 10) - 1;

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const expMonthName = monthNames[expMonthIdx];

  return expMonthName !== delMonthName || expYear !== delYear;
}

export function cleanScriptFullName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  let cleaned = fullName.trim();
  // Strip Option Call/Put and Strike Price e.g. PUT 7280, CALL 5000, CE 5000, PE 5000
  cleaned = cleaned.replace(/\s+(PUT|CALL|CE|PE)\s+\d+(\.\d+)?/gi, '');
  // Strip day + month + year e.g. 27 AUG 2026, 01-JUN-2025
  cleaned = cleaned.replace(/\s+\d{1,2}[-/\s]+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-/\s]+\d{2,4}/gi, '');
  // Strip month + year at end e.g. AUG 2026, JUN 26, DEC 2025
  cleaned = cleaned.replace(/\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-/\s]+\d{2,4}$/gi, '');
  // Strip standalone month or year if remaining at end
  cleaned = cleaned.replace(/\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/gi, '');
  cleaned = cleaned.replace(/\s+\d{4}$/g, '');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}
