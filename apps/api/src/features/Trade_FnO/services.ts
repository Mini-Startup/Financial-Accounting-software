import { prisma } from '../../database';
import { brokeragesService } from '../brokerages/services';
import { calculateTrade } from '../../utils/brokerage';
import type { BrokerageRule } from '../../utils/brokerage';

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
  exchangeTime?: string;
  uniqueTradeId?: string;
  orderTime?: string;
  instrumentType?: string;
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
        where: { code: { in: Array.from(uniqueClientCodes) } },
        select: { id: true, code: true },
      });
      for (const acc of accounts) {
        accountMap.set(acc.code, { id: acc.id });
      }
    }

    // ── 3. Batch fetch script-exchange mappings ─────────────────
    const mappingMap = new Map<string, { scriptId: string; exchangeId: string; exchangeCode: string }>();
    if (uniqueScriptCodes.size > 0) {
      const mappings = await prisma.scriptExchangeMapping.findMany({
        where: {
          exchangeScriptCode: { in: Array.from(uniqueScriptCodes), mode: 'insensitive' },
        },
        include: { exchange: { select: { code: true } } },
      });
      for (const m of mappings) {
        const key = m.exchangeScriptCode.toUpperCase();
        if (!mappingMap.has(key)) {
          mappingMap.set(key, {
            scriptId: m.scriptId,
            exchangeId: m.exchangeId,
            exchangeCode: m.exchange?.code || '',
          });
        }
      }
    }

    // ── 4. Batch fallback: scripts by name (only for codes not resolved above) ──
    const unresolvedScriptNames: string[] = [];
    for (const name of uniqueScriptNames) {
      if (!mappingMap.has(name)) {
        unresolvedScriptNames.push(name);
      }
    }

    const scriptFallbackMap = new Map<string, { scriptId: string; exchangeId: string; exchangeCode: string }>();
    if (unresolvedScriptNames.length > 0) {
      const scripts = await prisma.script.findMany({
        where: {
          OR: [
            { shortName: { in: unresolvedScriptNames, mode: 'insensitive' } },
            { fullName: { in: unresolvedScriptNames, mode: 'insensitive' } },
          ],
        },
        include: {
          scriptExchangeMappings: {
            include: { exchange: { select: { code: true } } },
            take: 1,
          },
        },
      });

      // If any scripts found have no exchange mapping, we might need a default exchange
      let defaultExchange: { id: string; code: string } | null = null;
      const needsDefault = scripts.some(
        (s) => !s.scriptExchangeMappings || s.scriptExchangeMappings.length === 0
      );
      if (needsDefault) {
        const ex = await prisma.exchange.findFirst({ select: { id: true, code: true } });
        if (ex) defaultExchange = ex;
      }

      for (const script of scripts) {
        const entry = {
          scriptId: script.id,
          exchangeId: script.scriptExchangeMappings?.[0]?.exchangeId || defaultExchange?.id || '',
          exchangeCode: script.scriptExchangeMappings?.[0]?.exchange?.code || defaultExchange?.code || '',
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
        const acc = accountMap.get(row.clientCode.trim());
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
        // Try exchange mapping first (most common)
        const mapped = mappingMap.get(scriptCode.toUpperCase()) || mappingMap.get(shortCode.toUpperCase());
        if (mapped) {
          resolvedScriptId = mapped.scriptId;
          resolvedExchangeId = mapped.exchangeId;
          exchangeCode = mapped.exchangeCode;
        } else {
          // Fallback: script name lookup
          const fallback = scriptFallbackMap.get(scriptCode.toUpperCase()) || scriptFallbackMap.get(shortCode.toUpperCase());
          if (fallback) {
            resolvedScriptId = fallback.scriptId;
            resolvedExchangeId = fallback.exchangeId;
            exchangeCode = fallback.exchangeCode;
          } else {
            errors.push(`Script mapping for '${scriptCode}' not found on any exchange`);
          }
        }
      }

      // 3. Date check
      if (!row.tradeTime || isNaN(Date.parse(row.tradeTime))) {
        errors.push(`Invalid trade date/time: '${row.tradeTime}'`);
      }

      // 4. Quantity check
      if (row.qty <= 0) {
        errors.push('Quantity must be greater than zero');
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
    const validRows = preview.filter((r) => r.status === 'Valid');

    if (validRows.length === 0) {
      return { importedCount: 0, failedCount: rows.length };
    }

    const toRule = (r: any): BrokerageRule => ({
      type: r.type as 'AMOUNT' | 'PERCENT',
      baseAmount: r.baseAmount,
      flatFee: r.flatFee,
      tradingBuyPct: r.tradingBuyPct,
      tradingSellPct: r.tradingSellPct,
      tradingMinFee: r.tradingMinFee,
      deliveryBuyPct: r.deliveryBuyPct,
      deliverySellPct: r.deliverySellPct,
      deliveryMinFee: r.deliveryMinFee,
    });

    const validRowsWithCalcs = await Promise.all(
      validRows.map(async (row) => {
        const targetExchangeId = exchangeId || row.resolvedExchangeId!;
        let clientRate = row.rate;
        let brokerRate = row.rate;
        let clientBrokerage = 0;
        let brokerBrokerage = 0;
        let profitTotal = 0;

        try {
          const clientRuleRow = await brokeragesService.resolve(
            row.resolvedAccountId!,
            targetExchangeId,
            'CLIENT',
            row.resolvedScriptId!
          );

          if (clientRuleRow) {
            const clientRule = toRule(clientRuleRow);

            let brokerRuleRow: any = null;
            if (brokerId) {
              brokerRuleRow = await brokeragesService.resolve(
                brokerId,
                targetExchangeId,
                'BROKER',
                row.resolvedScriptId!
              );
            }

            const brokerFallbackMode = Boolean(clientRule && !brokerRuleRow);

            if (!brokerFallbackMode && brokerId && brokerRuleRow) {
              const brokerRule = toRule(brokerRuleRow);
              const calc = calculateTrade({
                quantity: row.quantity,
                marketRate: row.rate,
                segment: 'TRADING',
                clientRule,
                brokerRule,
              });

              clientRate = calc.clientRate;
              brokerRate = calc.brokerRate;
              clientBrokerage = calc.clientBrokerage;
              brokerBrokerage = calc.brokerBrokerage;
              profitTotal = calc.totalProfit;
            } else {
              // Fallback
              const marketRounded = Number(row.rate.toFixed(4));
              clientRate = marketRounded;
              brokerRate = marketRounded;
              clientBrokerage = 0;
              brokerBrokerage = 0;
              profitTotal = 0;
            }
          }
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
      })
    );

function parseAndNormalizeExpiry(expiryStr: string | null | undefined): Date | null {
  if (!expiryStr) return null;
  const cleaned = expiryStr.trim();
  if (!cleaned) return null;

  // Check YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1; // 0-indexed
    const day = parseInt(ymdMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Check YYYY/MM/DD
  const ymdSlashMatch = cleaned.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymdSlashMatch) {
    const year = parseInt(ymdSlashMatch[1], 10);
    const month = parseInt(ymdSlashMatch[2], 10) - 1; // 0-indexed
    const day = parseInt(ymdSlashMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Handle DD-MMM-YY or DD-MMM-YYYY or DDMMMYY (e.g. 28APR26, 28-APR-26, 28-APR-2026)
  const regex = /^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2}|\d{4})$/;
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

    let importedCount = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Collect all unique valid expiry dates from rows
      const uniqueExpiryStrings = Array.from(
        new Set(
          validRowsWithCalcs
            .map(({ row }) => row.expiry?.trim())
            .filter(Boolean)
        )
      );

      // 2. Ensure each parsed expiry date exists in the database
      for (const expiryStr of uniqueExpiryStrings) {
        const parsedDate = parseAndNormalizeExpiry(expiryStr);
        if (parsedDate) {
          const existing = await tx.expiryDate.findUnique({
            where: { date: parsedDate },
          });
          if (!existing) {
            await tx.expiryDate.create({
              data: {
                date: parsedDate,
                isActive: true,
              },
            });
          }
        }
      }

      // 3. Insert the trades
      for (const { row, targetExchangeId, clientRate, brokerRate, clientBrokerage, brokerBrokerage, profitTotal } of validRowsWithCalcs) {
        importedCount++;

        const tradeDate = new Date(row.tradeDate);
        const timePart = row.tradeDate.includes(' ') ? row.tradeDate.split(' ')[1] : null;

        // Normalize the stored expiry date string to YYYY-MM-DD
        const parsedExpiry = parseAndNormalizeExpiry(row.expiry);
        const normalizedExpiryStr = parsedExpiry
          ? parsedExpiry.toISOString().split('T')[0]
          : (row.expiry || null);

        await tx.trade.create({
          data: {
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
            orderId: row.orderId || null,
            exchangeTime: row.exchangeTime || null,
            uniqueTradeId: row.uniqueTradeId || null,
            orderTime: row.orderTime || null,

            // Calculated fields
            clientRate,
            brokerRate,
            clientBrokerage,
            brokerBrokerage,
            profitTotal,
          },
        });
      }
    });

    return {
      importedCount,
      failedCount: rows.length - importedCount,
    };
  }

}

export const tradeImportService = new TradeImportService();

