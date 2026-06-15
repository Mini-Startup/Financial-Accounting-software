import { prisma } from '../../database';

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
}

export interface PreviewRow {
  tradeNumber: string;
  clientCode: string;
  scriptCode: string;
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
          const mapping = await prisma.scriptExchangeMapping.findFirst({
            where: {
              exchangeScriptCode: {
                equals: scriptCode,
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
            mappingCache.set(cacheKey, null);
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

      preview.push({
        tradeNumber: row.tradeNo,
        clientCode: row.clientCode,
        scriptCode: row.fullScript || row.script,
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
      });
    }

    return preview;
  }

  /**
   * Bulk save valid trades into the database.
   */
  async confirmImport(rows: PreviewRow[]) {
    // Re-verify items to make sure they are valid
    const parsed = rows.map((r) => ({
      tradeNo: r.tradeNumber,
      clientCode: r.clientCode,
      script: r.scriptCode,
      fullScript: r.scriptCode,
      expiry: '',
      terminal: '',
      type: r.buySell,
      qty: r.quantity,
      rate: r.rate,
      tradeTime: r.tradeDate,
      orderId: '',
      uniqueTradeId: '',
    }));

    const preview = await this.previewRows(parsed);
    const validRows = preview.filter((r) => r.status === 'Valid');

    if (validRows.length === 0) {
      return { importedCount: 0, failedCount: rows.length };
    }

    let importedCount = 0;

    await prisma.$transaction(
      validRows.map((row) => {
        importedCount++;

        const tradeDate = new Date(row.tradeDate);
        const timePart = row.tradeDate.includes(' ') ? row.tradeDate.split(' ')[1] : null;

        return prisma.trade.create({
          data: {
            tradeNumber: row.tradeNumber,
            tradeDate,
            tradeTime: timePart,
            accountId: row.resolvedAccountId!,
            scriptId: row.resolvedScriptId!,
            exchangeId: row.resolvedExchangeId!,
            transactionType: row.buySell,
            quantity: row.quantity,
            rate: row.rate,
            source: 'IMPORT',
            remarks: 'Imported via Trade_FnO wizard',
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
