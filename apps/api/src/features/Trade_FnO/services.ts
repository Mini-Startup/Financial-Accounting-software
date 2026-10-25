import { prisma } from '../../database';
import { brokeragesService } from '../brokerages/services';
import { calculateTradeRates, calculateBrokerBrokerage, round } from '../../utils/brokerage';

export interface ParsedTrade {
  tradeNo: string;
  script: string;
  fullScript: string;
  expiry: string;
  clientCode: string;
  terminal: string;
  type: 'BUY' | 'SELL';
  qty: number;
  rate: number;
  tradeTime: string;
  orderId: string;
  uniqueTradeId: string;
  exchangeTime: string;
  orderTime: string;
  instrumentType?: string;
}

export interface PreviewRow {
  tradeNumber: string;
  clientCode: string;
  scriptCode: string;
  scriptShortName: string;
  scriptFullName: string;
  exchange: string;
  buySell: 'BUY' | 'SELL';
  quantity: number;
  rate: number;
  tradeDate: string;
  status: 'Valid' | 'Invalid';
  errors: string[];
  resolvedAccountId?: string;
  resolvedScriptId?: string;
  resolvedExchangeId?: string;
  terminal: string;
  expiry: string;
  orderId?: string;
  exchOrderId?: string;
  exchangeTime?: string;
  uniqueTradeId?: string;
  orderTime?: string;
  instrumentType?: string;

  // New fields for Dubai FnO & trade imports
  dealerCode?: string;
  currencyCode?: string;
  securityName?: string;
  delMonth?: string;
  marketLot?: number;
  callPut?: string;
  strikePrice?: number;
  bloombergCode?: string;
  mktValue?: number;
  clnCommission?: number;
  clnExCharges?: number;
  clnCharges1?: number;
  clnCharges2?: number;
  vat?: number;
}

export function parseFlexibleDate(dateVal: string | Date | null | undefined): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? new Date() : dateVal;
  }
  const cleaned = dateVal.trim();
  if (!cleaned) return new Date();

  // 1. DD/MM/YYYY [HH:MM:SS] or DD-MM-YYYY [HH:MM:SS]
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    if (!isNaN(d.getTime())) return d;
  }

  // 2. YYYY-MM-DD [HH:MM:SS] or YYYY/MM/DD [HH:MM:SS]
  const ymdMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const minutes = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const seconds = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Standard JS Date fallback if valid
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // 4. Default to current Date
  return new Date();
}

function parseAndNormalizeExpiry(expiryStr: string | null | undefined): Date | null {
  if (!expiryStr) return null;
  const cleaned = expiryStr.trim();
  if (!cleaned) return null;

  // 1. DD/MM/YYYY or DD-MM-YYYY (with optional time)
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD (with optional time)
  const ymdMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // 3. Handle DD-MMM-YY or DD-MMM-YYYY or DDMMMYY (e.g. 28APR26, 28-APR-26, 28-APR-2026)
  const regex = /^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2}|\d{4})/;
  const match = cleaned.match(regex);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toUpperCase();
    let year = parseInt(match[3], 10);

    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };

    if (monthStr in months) {
      const month = months[monthStr];
      if (year < 100) {
        year += 2000;
      }
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Fallback to standard Date parsing if possible
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  return null;
}

export class TradeImportService {
  /**
   * Validate parsed trades against the database.
   * Uses batch queries to resolve all accounts and scripts upfront,
   * then iterates rows with in-memory lookups only — no per-row DB hits.
   */
  async previewRows(rows: ParsedTrade[]): Promise<PreviewRow[]> {
    // ── 1. Collect unique lookup keys ────────────────────────────
    const uniqueClientCodes = new Set<string>();
    const uniqueScriptCodes = new Set<string>(); // for exchange mapping lookup
    const uniqueScriptNames = new Set<string>(); // for fallback script lookup

    for (const row of rows) {
      if (row.clientCode?.trim()) {
        uniqueClientCodes.add(row.clientCode.trim());
      }
      const fullCode = (row.fullScript || row.script || '').trim();
      const shortCode = (row.script || '').trim();
      if (fullCode) uniqueScriptCodes.add(fullCode.toUpperCase());
      if (shortCode) uniqueScriptCodes.add(shortCode.toUpperCase());
      if (fullCode) uniqueScriptNames.add(fullCode.toUpperCase());
      if (shortCode) uniqueScriptNames.add(shortCode.toUpperCase());
    }

    // ── 2. Batch fetch accounts ─────────────────────────────────
    const accountMap = new Map<string, { id: string }>();
    if (uniqueClientCodes.size > 0) {
      const accounts = await prisma.account.findMany({
        where: { code: { in: Array.from(uniqueClientCodes), mode: 'insensitive' } },
        select: { id: true, code: true },
      });
      for (const acc of accounts) {
        accountMap.set(acc.code.trim().toUpperCase(), { id: acc.id });
      }
    }

    // ── 3. Batch fetch scripts by shortName or fullName ─────────────
    const scriptFallbackMap = new Map<string, { scriptId: string; exchangeId: string; exchangeCode: string }>();
    const allSearchNames = Array.from(new Set([...uniqueScriptCodes, ...uniqueScriptNames]));

    if (allSearchNames.length > 0) {
      const scripts = await prisma.script.findMany({
        where: {
          OR: [
            { shortName: { in: allSearchNames, mode: 'insensitive' } },
            { fullName: { in: allSearchNames, mode: 'insensitive' } },
          ],
        },
        include: {
          exchange: { select: { id: true, code: true } },
        },
      });

      for (const script of scripts) {
        const exId = script.exchangeId || script.exchange?.id;
        const exCode = script.exchange?.code || '';

        if (!exId) continue;

        const entry = {
          scriptId: script.id,
          exchangeId: exId,
          exchangeCode: exCode,
        };
        // Index by both shortName and fullName
        if (script.shortName) scriptFallbackMap.set(script.shortName.toUpperCase(), entry);
        if (script.fullName) scriptFallbackMap.set(script.fullName.toUpperCase(), entry);
      }
    }

    // ── 5. Build preview rows using in-memory maps only ─────────
    const preview: PreviewRow[] = [];

    for (const row of rows) {
      const errors: string[] = [];
      let resolvedAccountId: string | undefined;
      let resolvedScriptId: string | undefined;
      let resolvedExchangeId: string | undefined;
      let exchangeCode = '';

      // 1. Resolve Account
      if (!row.clientCode || row.clientCode.trim() === '') {
        errors.push('Client Code is required');
      } else {
        const acc = accountMap.get(row.clientCode.trim().toUpperCase());
        if (acc) {
          resolvedAccountId = acc.id;
        } else {
          errors.push(`Client '${row.clientCode}' not found`);
        }
      }

      // 2. Resolve Script & Exchange
      const scriptCode = (row.fullScript || row.script || '').trim();
      const shortCode = (row.script || '').trim();

      if (!scriptCode) {
        errors.push('Script/Symbol Code is required');
      } else {
        // Lookup script from batch map
        const resolved = scriptFallbackMap.get(scriptCode.toUpperCase()) || scriptFallbackMap.get(shortCode.toUpperCase());
        if (resolved) {
          resolvedScriptId = resolved.scriptId;
          resolvedExchangeId = resolved.exchangeId;
          exchangeCode = resolved.exchangeCode;
        } else {
          errors.push(`Script mapping for '${scriptCode}' not found on any exchange`);
        }
      }

      // 3. Date check
      if (!row.tradeTime || isNaN(Date.parse(row.tradeTime))) {
        errors.push(`Invalid trade date/time: '${row.tradeTime}'`);
      }

      // 4. Quantity check
      if (row.qty <= 0) {
        errors.push('Quantity must be greater than zero');
      } else if (!Number.isInteger(row.qty)) {
        errors.push('Quantity must be a whole number (no decimals allowed)');
      }

      // 4b. Expiry vs Trade date check
      if (row.expiry && row.tradeTime) {
        const tDate = parseFlexibleDate(row.tradeTime);
        const eDate = parseAndNormalizeExpiry(row.expiry);
        if (eDate && tDate) {
          const tUtc = Date.UTC(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
          const eUtc = Date.UTC(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
          if (eUtc < tUtc) {
            errors.push('Expiry date cannot be before trade date');
          }
        }
      }

      // 5. Rate check
      if (row.rate < 0) {
        errors.push('Rate cannot be negative');
      }

      // 6. Instrument type check (must start with FUT, case-insensitive)
      if (!row.instrumentType || !row.instrumentType.toUpperCase().startsWith('FUT')) {
        errors.push('Not a valid future trade');
      }

      preview.push({
        tradeNumber: row.tradeNo,
        clientCode: row.clientCode,
        scriptCode: row.fullScript || row.script,
        scriptShortName: row.script,
        scriptFullName: row.fullScript,
        exchange: exchangeCode,
        buySell: row.type,
        quantity: row.qty,
        rate: row.rate,
        tradeDate: row.tradeTime,
        status: errors.length === 0 ? 'Valid' : 'Invalid',
        errors,
        resolvedAccountId,
        resolvedScriptId,
        resolvedExchangeId,
        terminal: row.terminal,
        expiry: row.expiry,
        orderId: row.orderId,
        exchangeTime: row.exchangeTime,
        uniqueTradeId: row.uniqueTradeId,
        orderTime: row.orderTime,
        instrumentType: row.instrumentType,
      });
    }

    return preview;
  }

  /**
   * Bulk save valid trades into the database.
   */
  async confirmImport(rows: PreviewRow[], brokerId?: string, exchangeId?: string) {
    // Re-verify items to make sure they are valid
    const parsed = rows.map((r) => ({
      tradeNo: r.tradeNumber,
      clientCode: r.clientCode,
      script: r.scriptShortName,
      fullScript: r.scriptFullName,
      expiry: r.expiry || '',
      terminal: r.terminal || '',
      type: r.buySell,
      qty: r.quantity,
      rate: r.rate,
      tradeTime: r.tradeDate,
      orderId: r.orderId || '',
      uniqueTradeId: r.uniqueTradeId || '',
      exchangeTime: r.exchangeTime || '',
      orderTime: r.orderTime || '',
      instrumentType: r.instrumentType || '',
    }));

    const preview = await this.previewRows(parsed);

    // Merge pre-resolved IDs from frontend rows with backend preview results
    const resolvedRows: PreviewRow[] = rows.map((incomingRow, idx) => {
      const revalidated = preview[idx];

      const resolvedAccountId = incomingRow.resolvedAccountId || revalidated?.resolvedAccountId;
      const resolvedScriptId = incomingRow.resolvedScriptId || revalidated?.resolvedScriptId;
      // Per-row exchange is the source of truth; only use global exchangeId as last resort for NSE-style single-exchange imports
      const resolvedExchangeId = incomingRow.resolvedExchangeId || revalidated?.resolvedExchangeId || exchangeId;

      const isValid = Boolean(resolvedAccountId && resolvedScriptId && resolvedExchangeId);

      return {
        ...incomingRow,
        resolvedAccountId,
        resolvedScriptId,
        resolvedExchangeId,
        status: isValid ? 'Valid' : 'Invalid',
      };
    });

    const validRows = resolvedRows.filter((r) => r.status === 'Valid');

    if (validRows.length === 0) {
      return { importedCount: 0, failedCount: rows.length };
    }

    const accountIds = Array.from(
      new Set(
        validRows
          .map((r) => r.resolvedAccountId!)
          .concat(brokerId ? [brokerId] : [])
          .filter(Boolean)
      )
    );

    const allBrokerageRules = await prisma.brokerage.findMany({
      where: {
        accountId: { in: accountIds },
        appliesTo: 'CLIENT',
      },
    });

    const resolveRuleFast = (accId: string, scriptId: string, direction: 'BUY' | 'SELL') => {
      const forAcc = allBrokerageRules.filter((r) => r.accountId === accId);
      if (forAcc.length === 0) return null;

      const scriptExact = forAcc.find((r) => r.scriptId === scriptId && r.direction === direction);
      if (scriptExact) return scriptExact;

      const scriptBoth = forAcc.find((r) => r.scriptId === scriptId && r.direction === 'BOTH');
      if (scriptBoth) return scriptBoth;

      const defaultExact = forAcc.find((r) => !r.scriptId && r.direction === direction);
      if (defaultExact) return defaultExact;

      const defaultBoth = forAcc.find((r) => !r.scriptId && r.direction === 'BOTH');
      return defaultBoth || null;
    };

    const validRowsWithCalcs = validRows.map((row) => {
      const targetExchangeId = row.resolvedExchangeId || '';
      const side: 'BUY' | 'SELL' = row.buySell === 'BUY' ? 'BUY' : 'SELL';

      let clientRate = row.rate;
      let brokerRate = row.rate;
      let clientBrokerage = 0;
      let brokerBrokerage = 0;
      let profitTotal = 0;

      try {
        const clientRuleRow = resolveRuleFast(
          row.resolvedAccountId!,
          row.resolvedScriptId!,
          side,
        );

        const brokerCharges = calculateBrokerBrokerage(
          row.clnCommission,
          row.clnExCharges,
          row.clnCharges1,
          row.clnCharges2,
        );

        const clientRule = clientRuleRow
          ? {
              quantity: clientRuleRow.quantity,
              brokerage: clientRuleRow.brokerage,
              direction: clientRuleRow.direction as any,
            }
          : null;

        const calc = calculateTradeRates({
          rate: row.rate,
          quantity: row.quantity,
          marketLot: row.marketLot ? Number(row.marketLot) : null,
          side,
          clientRule,
          brokerBrokerage: brokerCharges,
        });

        const effectiveMktVal =
          row.mktValue && Number(row.mktValue) > 0
            ? Number(row.mktValue)
            : calc.marketValue;

        clientRate = side === 'BUY'
          ? round(effectiveMktVal + calc.clientBrokerage)
          : round(effectiveMktVal - calc.clientBrokerage);

        brokerRate = side === 'BUY'
          ? round(effectiveMktVal + calc.brokerBrokerage)
          : round(effectiveMktVal - calc.brokerBrokerage);

        clientBrokerage = calc.clientBrokerage;
        brokerBrokerage = calc.brokerBrokerage;
        profitTotal = calc.profitTotal;
      } catch (err) {
        console.error('Failed to calculate brokerage for imported row:', err);
      }

      return {
        row,
        targetExchangeId,
        clientRate,
        brokerRate,
        clientBrokerage,
        brokerBrokerage,
        profitTotal,
      };
    });

    let importedCount = 0;

    // Batch insertion in chunks of 2000 for high performance
    const BATCH_SIZE = 2000;
    
    // Perform bulk insertion using createMany in batches
    for (let i = 0; i < validRowsWithCalcs.length; i += BATCH_SIZE) {
      const chunk = validRowsWithCalcs.slice(i, i + BATCH_SIZE);
      const tradesData = chunk.map(({ row, targetExchangeId, clientRate, brokerRate, clientBrokerage, brokerBrokerage, profitTotal }) => {
        const tradeDate = parseFlexibleDate(row.tradeDate);
        const timePart = row.tradeDate.includes(' ') ? row.tradeDate.split(' ')[1] : null;

        const parsedExpiry = parseAndNormalizeExpiry(row.expiry);
        const normalizedExpiryStr = parsedExpiry
          ? parsedExpiry.toISOString().split('T')[0]
          : (row.expiry || null);

        return {
          tradeNumber: row.tradeNumber,
          tradeDate,
          tradeTime: timePart,
          accountId: row.resolvedAccountId!,
          brokerId: brokerId || null,
          scriptId: row.resolvedScriptId!,
          exchangeId: targetExchangeId,
          transactionType: row.buySell,
          quantity: row.quantity,
          rate: row.rate,
          source: 'IMPORT',
          remarks: 'Imported via Trade_FnO wizard',
          terminal: row.terminal || null,
          expiry: normalizedExpiryStr,
          orderId: row.exchOrderId || row.orderId || null,
          exchangeTime: row.exchangeTime || null,
          uniqueTradeId: row.uniqueTradeId || null,
          orderTime: row.orderTime || null,

          dealerCode: row.dealerCode || null,
          currencyCode: row.currencyCode || null,
          securityName: row.securityName || null,
          delMonth: row.delMonth || null,
          marketLot: row.marketLot ? Number(row.marketLot) : null,
          callPut: row.callPut || null,
          strikePrice: row.strikePrice ? Number(row.strikePrice) : null,
          bloombergCode: row.bloombergCode || null,
          mktValue: row.mktValue ? Number(row.mktValue) : null,
          clnCommission: row.clnCommission ? Number(row.clnCommission) : null,
          clnExCharges: row.clnExCharges ? Number(row.clnExCharges) : null,
          clnCharges1: row.clnCharges1 ? Number(row.clnCharges1) : null,
          clnCharges2: row.clnCharges2 ? Number(row.clnCharges2) : null,
          vat: row.vat ? Number(row.vat) : null,

          clientRate,
          brokerRate,
          clientBrokerage,
          brokerBrokerage,
          profitTotal,
        };
      });

      const res = await prisma.trade.createMany({
        data: tradesData,
      });

      importedCount += res.count;
    }

    return {
      importedCount,
      failedCount: rows.length - importedCount,
    };
  }
}

export const tradeImportService = new TradeImportService();

