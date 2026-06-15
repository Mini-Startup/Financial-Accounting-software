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
}



export class TradeImportService {
  /**
   * Validate parsed trades against the database.
   */
  async previewRows(rows: ParsedTrade[]): Promise<PreviewRow[]> {
    const preview: PreviewRow[] = [];

    const accountCache = new Map<string, any>();
    const mappingCache = new Map<string, any>();

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
        const cachedAccount = accountCache.get(row.clientCode);
        if (cachedAccount === null) {
          errors.push(`Client '${row.clientCode}' not found`);
        } else if (cachedAccount) {
          resolvedAccountId = cachedAccount.id;
        } else {
          const account = await prisma.account.findFirst({
            where: { code: row.clientCode },
          });
          if (account) {
            accountCache.set(row.clientCode, account);
            resolvedAccountId = account.id;
          } else {
            accountCache.set(row.clientCode, null);
            errors.push(`Client '${row.clientCode}' not found`);
          }
        }
      }

      // 2. Resolve Script & Exchange mapping
      const scriptCode = row.fullScript || row.script;
      if (!scriptCode || scriptCode.trim() === '') {
        errors.push('Script/Symbol Code is required');
      } else {
        const cacheKey = scriptCode.toUpperCase();
        const cachedMapping = mappingCache.get(cacheKey);

        if (cachedMapping === null) {
          errors.push(`Script mapping for '${scriptCode}' not found on any exchange`);
        } else if (cachedMapping) {
          resolvedScriptId = cachedMapping.scriptId;
          resolvedExchangeId = cachedMapping.exchangeId;
          exchangeCode = cachedMapping.exchange?.code || '';
        } else {
          // 2.1 Try to resolve via ScriptExchangeMapping first (matching either fullScript or script code)
          const mapping = await prisma.scriptExchangeMapping.findFirst({
            where: {
              exchangeScriptCode: {
                in: [row.script, row.fullScript].filter(Boolean) as string[],
                mode: 'insensitive',
              },
            },
            include: {
              exchange: true,
            },
          });

          if (mapping) {
            mappingCache.set(cacheKey, mapping);
            resolvedScriptId = mapping.scriptId;
            resolvedExchangeId = mapping.exchangeId;
            exchangeCode = mapping.exchange?.code || '';
          } else {
            // 2.2 Fallback: Try to resolve by matching Script table's short_name or full_name directly
            const script = await prisma.script.findFirst({
              where: {
                OR: [
                  { shortName: { equals: row.script, mode: 'insensitive' } },
                  { shortName: { equals: row.fullScript, mode: 'insensitive' } },
                  { fullName: { equals: row.script, mode: 'insensitive' } },
                  { fullName: { equals: row.fullScript, mode: 'insensitive' } },
                ],
              },
              include: {
                scriptExchangeMappings: {
                  include: { exchange: true },
                },
              },
            });

            if (script) {
              resolvedScriptId = script.id;
              // If it has mappings, use the first mapping's exchange
              if (script.scriptExchangeMappings && script.scriptExchangeMappings.length > 0) {
                const firstMap = script.scriptExchangeMappings[0];
                resolvedExchangeId = firstMap.exchangeId;
                exchangeCode = firstMap.exchange?.code || '';
              } else {
                // Default to first exchange in DB
                const defaultExchange = await prisma.exchange.findFirst();
                if (defaultExchange) {
                  resolvedExchangeId = defaultExchange.id;
                  exchangeCode = defaultExchange.code;
                }
              }
              // Cache a dummy mapping object so we don't hit DB again
              mappingCache.set(cacheKey, {
                scriptId: resolvedScriptId,
                exchangeId: resolvedExchangeId,
                exchange: { code: exchangeCode },
              });
            } else {
              mappingCache.set(cacheKey, null);
              errors.push(`Script mapping for '${scriptCode}' not found on any exchange`);
            }
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

    let importedCount = 0;

    await prisma.$transaction(
      validRowsWithCalcs.map(({ row, targetExchangeId, clientRate, brokerRate, clientBrokerage, brokerBrokerage, profitTotal }) => {
        importedCount++;

        const tradeDate = new Date(row.tradeDate);
        const timePart = row.tradeDate.includes(' ') ? row.tradeDate.split(' ')[1] : null;

        return prisma.trade.create({
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
            expiry: row.expiry || null,
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
      })
    );

    return {
      importedCount,
      failedCount: rows.length - importedCount,
    };
  }

}

export const tradeImportService = new TradeImportService();
