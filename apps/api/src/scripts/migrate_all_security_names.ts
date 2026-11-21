import 'dotenv/config';
import { prisma } from '../database';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatExpiryToDDMMMYY(expiry: string | Date | null | undefined): string {
  if (!expiry) return '';
  if (expiry instanceof Date) {
    if (isNaN(expiry.getTime())) return '';
    const day = String(expiry.getUTCDate()).padStart(2, '0');
    const month = MONTHS[expiry.getUTCMonth()];
    const year = String(expiry.getUTCFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  }

  const str = String(expiry).trim();
  if (!str) return '';

  // Already in DD-MMM-YY format, e.g. "04-NOV-26" or "4-NOV-26"
  const hyphenDmy = str.match(/^(\d{1,2})[-]([A-Za-z]{3})[-](\d{2,4})$/);
  if (hyphenDmy) {
    const day = hyphenDmy[1].padStart(2, '0');
    const month = hyphenDmy[2].toUpperCase();
    const year = hyphenDmy[3].slice(-2);
    return `${day}-${month}-${year}`;
  }

  // DD MMM YYYY or DD MMM YY with spaces, e.g. "04 NOV 2026" or "04 NOV 26"
  const spaceDmy = str.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
  if (spaceDmy) {
    const day = spaceDmy[1].padStart(2, '0');
    const month = spaceDmy[2].toUpperCase();
    const year = spaceDmy[3].slice(-2);
    return `${day}-${month}-${year}`;
  }

  // Jammed format, e.g. "04NOV26" or "4NOV26" or "04NOV2026"
  const jammedMatch = str.match(/^(\d{1,2})([A-Za-z]{3})(\d{2,4})$/);
  if (jammedMatch) {
    const day = jammedMatch[1].padStart(2, '0');
    const month = jammedMatch[2].toUpperCase();
    const year = jammedMatch[3].slice(-2);
    return `${day}-${month}-${year}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (m >= 0 && m < 12) {
      return `${String(d).padStart(2, '0')}-${MONTHS[m]}-${String(y).slice(-2)}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY or DD-MM-YY
  const dmyNum = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyNum) {
    const d = parseInt(dmyNum[1], 10);
    const m = parseInt(dmyNum[2], 10) - 1;
    let y = parseInt(dmyNum[3], 10);
    if (y < 100) y += 2000;
    if (m >= 0 && m < 12) {
      return `${String(d).padStart(2, '0')}-${MONTHS[m]}-${String(y).slice(-2)}`;
    }
  }

  // Month-Year only, e.g. "Nov-26" or "NOV-2026"
  const myMatch = str.match(/^([A-Za-z]{3})[-/\s]?(\d{2,4})$/);
  if (myMatch) {
    const month = myMatch[1].toUpperCase();
    const year = myMatch[2].slice(-2);
    return `${month}-${year}`;
  }

  return str.toUpperCase();
}

export function generateCanonicalSecurityName(opts: {
  scriptFullName?: string;
  scriptShortName?: string;
  expiry?: string | Date | null;
  expiryDate?: string | Date | null;
  delMonth?: string | null;
  callPut?: string | null;
  strikePrice?: number | string | null;
}): string {
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

async function migrate() {
  console.log('=== STARTING SECURITY NAME STANDARDIZATION TO [Script Full Name] [DD-MMM-YY] ===\n');

  // 1. Update Trades
  const trades = await prisma.trade.findMany({
    include: { script: true },
    orderBy: { tradeDate: 'asc' },
  });

  console.log(`Found ${trades.length} trades.`);
  let tradeUpdated = 0;

  for (const t of trades) {
    const canonical = generateCanonicalSecurityName({
      scriptFullName: t.script?.fullName || t.script?.shortName,
      scriptShortName: t.script?.shortName,
      expiry: t.expiry,
      callPut: t.callPut,
      strikePrice: t.strikePrice,
    });

    if (!canonical) continue;

    if (t.securityName !== canonical) {
      console.log(`[TRADE UPDATE] #${t.tradeNumber || t.id}: "${t.securityName}" -> "${canonical}"`);
      await prisma.trade.update({
        where: { id: t.id },
        data: { securityName: canonical },
      });
      tradeUpdated++;
    }
  }
  console.log(`Trades updated: ${tradeUpdated}/${trades.length}`);

  // 2. Update Closing Rates
  const closingRates = await prisma.closingRate.findMany({
    include: { script: true },
    orderBy: { rateDate: 'asc' },
  });

  console.log(`\nFound ${closingRates.length} closing rates.`);
  let crUpdated = 0;

  for (const cr of closingRates) {
    const canonical = generateCanonicalSecurityName({
      scriptFullName: cr.script?.fullName || cr.script?.shortName,
      scriptShortName: cr.script?.shortName,
      expiry: cr.expiry,
      delMonth: cr.delMonth,
      callPut: cr.callPut,
      strikePrice: cr.strikePrice,
    });

    if (!canonical) continue;

    if (cr.securityName !== canonical) {
      console.log(`[CR UPDATE] ${cr.id}: "${cr.securityName}" -> "${canonical}"`);
      await prisma.closingRate.update({
        where: { id: cr.id },
        data: { securityName: canonical },
      });
      crUpdated++;
    }
  }
  console.log(`Closing rates updated: ${crUpdated}/${closingRates.length}`);

  console.log('\n=== MIGRATION COMPLETE ===');
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
