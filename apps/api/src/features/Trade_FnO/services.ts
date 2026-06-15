import { BadRequestException } from '../../errors';
import { prisma } from '../../database';

export interface NormalizedImportRow {
  tradeNumber: string;
  clientCode: string;
  scriptCode: string;
  buySell: 'BUY' | 'SELL';
  quantity: number;
  rate: number;
  tradeDate: string;
  tradeTime?: string;
  exchange: string;
}

export interface PreviewRow extends NormalizedImportRow {
  status: 'Valid' | 'Invalid';
  errors: string[];
}

export class TradeImportService {
  /**
   * Parse a CSV/Text file content and return normalized trade objects.
   */
  parseFile(content: string): NormalizedImportRow[] {
    if (!content || content.trim() === '') {
      throw new BadRequestException('File is empty');
    }

    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('File must contain at least a header and one data row');
    }

    // Determine separator: comma, tab, or semicolon
    let sep = ',';
    const firstLine = lines[0];
    if (firstLine.includes('\t')) sep = '\t';
    else if (firstLine.includes(';')) sep = ';';

    const parseRow = (rowStr: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_/.-]/g, ''));
    
    const headerMap: { [key: string]: keyof NormalizedImportRow } = {
      tradenumber: 'tradeNumber', tradeno: 'tradeNumber', tradeid: 'tradeNumber', ticket: 'tradeNumber',
      client: 'clientCode', clientcode: 'clientCode', account: 'clientCode', party: 'clientCode', code: 'clientCode', cli: 'clientCode',
      script: 'scriptCode', symbol: 'scriptCode', scriptcode: 'scriptCode', instrument: 'scriptCode', security: 'scriptCode',
      qty: 'quantity', quantity: 'quantity', shares: 'quantity', vol: 'quantity', volume: 'quantity',
      rate: 'rate', price: 'rate', traderate: 'rate', unitprice: 'rate',
      type: 'buySell', buysell: 'buySell', action: 'buySell', bs: 'buySell', transaction: 'buySell',
      date: 'tradeDate', tradedate: 'tradeDate',
      time: 'tradeTime', tradetime: 'tradeTime',
      exchange: 'exchange', exch: 'exchange', market: 'exchange'
    };

    const indices: { [key in keyof NormalizedImportRow]?: number } = {};
    headers.forEach((h, idx) => {
      const prop = headerMap[h];
      if (prop) {
        indices[prop] = idx;
      }
    });

    const requiredProps: (keyof NormalizedImportRow)[] = ['tradeNumber', 'clientCode', 'scriptCode', 'buySell', 'quantity', 'rate', 'tradeDate', 'exchange'];
    const missing = requiredProps.filter(p => indices[p] === undefined);
    if (missing.length > 0) {
      throw new BadRequestException(`Missing required columns in CSV header: ${missing.join(', ')}. Found headers: ${lines[0]}`);
    }

    const rows: NormalizedImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = parseRow(lines[i]);
      if (parts.length < headers.length) continue;

      const getValue = (prop: keyof NormalizedImportRow): string => {
        const idx = indices[prop];
        return idx !== undefined ? parts[idx] : '';
      };

      const tradeNumber = getValue('tradeNumber');
      const clientCode = getValue('clientCode');
      const scriptCode = getValue('scriptCode');
      const rawBuySell = getValue('buySell').toUpperCase();
      const rawQty = getValue('quantity');
      const rawRate = getValue('rate');
      const rawDate = getValue('tradeDate');
      const tradeTime = getValue('tradeTime') || undefined;
      const exchange = getValue('exchange').toUpperCase();

      let buySell: 'BUY' | 'SELL' = 'BUY';
      if (rawBuySell.startsWith('S') || rawBuySell.startsWith('SELL') || rawBuySell === 'O' || rawBuySell === 'SHORT') {
        buySell = 'SELL';
      }

      rows.push({
        tradeNumber,
        clientCode,
        scriptCode,
        buySell,
        quantity: parseFloat(rawQty) || 0,
        rate: parseFloat(rawRate) || 0,
        tradeDate: rawDate,
        tradeTime,
        exchange
      });
    }

    return rows;
  }

  /**
   * Run validations against database for a list of normalized rows.
   */
  async previewRows(rows: NormalizedImportRow[]): Promise<PreviewRow[]> {
    const preview: PreviewRow[] = [];

    const accountCache = new Map<string, any>();
    const exchangeCache = new Map<string, any>();
    const scriptCache = new Map<string, string | null>();

    for (const row of rows) {
      const errors: string[] = [];

      if (!row.tradeNumber || row.tradeNumber.trim() === '') {
        errors.push('Trade Number is required');
      }

      let accountId = '';
      if (!row.clientCode || row.clientCode.trim() === '') {
        errors.push('Client Code is required');
      } else {
        const cachedAccount = accountCache.get(row.clientCode);
        if (cachedAccount === null) {
          errors.push(`Client '${row.clientCode}' not found`);
        } else if (cachedAccount) {
          accountId = cachedAccount.id;
        } else {
          const account = await prisma.account.findFirst({
            where: { code: row.clientCode },
          });
          if (account) {
            accountCache.set(row.clientCode, account);
            accountId = account.id;
          } else {
            accountCache.set(row.clientCode, null);
            errors.push(`Client '${row.clientCode}' not found`);
          }
        }
      }

      let exchangeId = '';
      if (!row.exchange || row.exchange.trim() === '') {
        errors.push('Exchange code is required');
      } else {
        const cachedExch = exchangeCache.get(row.exchange);
        if (cachedExch === null) {
          errors.push(`Exchange '${row.exchange}' not found`);
        } else if (cachedExch) {
          exchangeId = cachedExch.id;
        } else {
          const exchange = await prisma.exchange.findFirst({
            where: { code: row.exchange },
          });
          if (exchange) {
            exchangeCache.set(row.exchange, exchange);
            exchangeId = exchange.id;
          } else {
            exchangeCache.set(row.exchange, null);
            errors.push(`Exchange '${row.exchange}' not found`);
          }
        }
      }

      if (exchangeId && row.scriptCode) {
        const cacheKey = `${exchangeId}_${row.scriptCode.toUpperCase()}`;
        const cachedScriptId = scriptCache.get(cacheKey);

        if (cachedScriptId === null) {
          errors.push(`Script mapping for '${row.scriptCode}' on ${row.exchange} not found`);
        } else if (!cachedScriptId) {
          const mapping = await prisma.scriptExchangeMapping.findFirst({
            where: {
              exchangeId,
              exchangeScriptCode: {
                equals: row.scriptCode,
                mode: 'insensitive'
              }
            },
            include: { script: true }
          });
          if (mapping) {
            scriptCache.set(cacheKey, mapping.scriptId);
          } else {
            scriptCache.set(cacheKey, null);
            errors.push(`Script mapping for '${row.scriptCode}' on ${row.exchange} not found`);
          }
        }
      } else if (!row.scriptCode) {
        errors.push('Script/Symbol Code is required');
      }

      if (row.quantity <= 0) {
        errors.push('Quantity must be greater than zero');
      }

      if (row.rate <= 0) {
        errors.push('Rate must be greater than zero');
      }

      const parsedDate = new Date(row.tradeDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Invalid trade date: '${row.tradeDate}'`);
      }

      preview.push({
        ...row,
        status: errors.length === 0 ? 'Valid' : 'Invalid',
        errors
      });
    }

    return preview;
  }

  /**
   * Import all valid rows.
   */
  async confirmImport(rows: NormalizedImportRow[]) {
    const preview = await this.previewRows(rows);
    const validRows = preview.filter(r => r.status === 'Valid');

    if (validRows.length === 0) {
      return { importedCount: 0, failedCount: rows.length };
    }

    const accountCodes = Array.from(new Set(validRows.map(r => r.clientCode)));
    const exchangeCodes = Array.from(new Set(validRows.map(r => r.exchange)));

    const accounts = await prisma.account.findMany({
      where: { code: { in: accountCodes } }
    });
    const exchanges = await prisma.exchange.findMany({
      where: { code: { in: exchangeCodes } }
    });

    const accountMap = new Map(accounts.map(a => [a.code, a.id]));
    const exchangeMap = new Map(exchanges.map(e => [e.code, e.id]));

    const exchangeIds = exchanges.map(e => e.id);
    const scriptMappings = await prisma.scriptExchangeMapping.findMany({
      where: { exchangeId: { in: exchangeIds } }
    });
    
    const mappingMap = new Map(
      scriptMappings.map(m => [`${m.exchangeId}_${m.exchangeScriptCode.toUpperCase()}`, m.scriptId])
    );

    let importedCount = 0;

    await prisma.$transaction(
      validRows.map(row => {
        const accountId = accountMap.get(row.clientCode);
        const exchangeId = exchangeMap.get(row.exchange);
        const scriptId = mappingMap.get(`${exchangeId}_${row.scriptCode.toUpperCase()}`);

        if (!accountId || !exchangeId || !scriptId) {
          throw new Error(`Data dependency lost during transaction for trade: ${row.tradeNumber}`);
        }

        importedCount++;

        return prisma.trade.create({
          data: {
            tradeNumber: row.tradeNumber,
            tradeDate: new Date(row.tradeDate),
            tradeTime: row.tradeTime || null,
            accountId,
            exchangeId,
            scriptId,
            transactionType: row.buySell,
            quantity: row.quantity,
            rate: row.rate,
            source: 'IMPORT',
            remarks: 'Imported via Trade Import wizard'
          }
        });
      })
    );

    return {
      importedCount,
      failedCount: rows.length - importedCount
    };
  }
}

export const tradeImportService = new TradeImportService();
