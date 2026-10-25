import { prisma } from '../../database';
import { BadRequestException } from '../../errors';
import { deriveSecurityName } from './utils';

export interface SettlementTradePreview {
  tradeType: 'CARRY_FORWARD' | 'BACK_FORWARD' | 'SETTLEMENT';
  tradeDate: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  brokerId: string | null;
  brokerCode: string | null;
  brokerName: string | null;
  scriptId: string;
  scriptShortName: string;
  scriptFullName: string;
  exchangeId: string;
  exchangeCode: string;
  securityName: string;
  transactionType: 'BUY' | 'SELL';
  quantity: number;
  rate: number;
  expiry: string | null;
  currencyCode?: string;
}

export interface SettlementError {
  securityName: string;
  expiry?: string | null;
  message: string;
}

function parseExpiryDateString(expiryStr?: string | null): string | null {
  if (!expiryStr) return null;
  const cleaned = expiryStr.trim().split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // DD-MMM-YYYY or DD-MMM-YY
  const mmmMatch = cleaned.match(/^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2}|\d{4})$/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const monthStr = mmmMatch[2].toUpperCase();
    let y = parseInt(mmmMatch[3], 10);
    if (y < 100) y += 2000;
    const months: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };
    if (monthStr in months) {
      return `${y}-${months[monthStr]}-${day}`;
    }
  }

  // DD/MM/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

export class SettlementEngine {
  async computeSettlement(closingRateDateStr: string): Promise<{
    preview: SettlementTradePreview[];
    errors: SettlementError[];
    settlementFromDate: string;
    settlementToDate: string;
    unsettledTradesCount: number;
    unsettledTradeIds: string[];
  }> {
    const closingDate = new Date(closingRateDateStr);
    closingDate.setUTCHours(23, 59, 59, 999);

    const nextDay = new Date(closingDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    // 1. Fetch all unsettled trades up to closingRateDate (including prior BF trades which have settlementId = null)
    const unsettledTrades = await prisma.trade.findMany({
      where: {
        settlementId: null,
        tradeDate: {
          lte: closingDate,
        },
      },
      include: {
        account: true,
        broker: true,
        script: {
          include: { currency: true },
        },
        exchange: true,
      },
      orderBy: {
        tradeDate: 'asc',
      },
    });

    if (unsettledTrades.length === 0) {
      return {
        preview: [],
        errors: [],
        settlementFromDate: closingRateDateStr,
        settlementToDate: closingRateDateStr,
        unsettledTradesCount: 0,
        unsettledTradeIds: [],
      };
    }

    const earliestTradeDate = unsettledTrades[0].tradeDate;
    const settlementFromDate = earliestTradeDate.toISOString().split('T')[0];

    // 2. Fetch closing rates for closingRateDate
    const rateDateStart = new Date(closingRateDateStr);
    rateDateStart.setUTCHours(0, 0, 0, 0);
    const rateDateEnd = new Date(closingRateDateStr);
    rateDateEnd.setUTCHours(23, 59, 59, 999);

    let closingRates = await prisma.closingRate.findMany({
      where: {
        rateDate: {
          gte: rateDateStart,
          lte: rateDateEnd,
        },
      },
    });

    if (closingRates.length === 0) {
      closingRates = await prisma.closingRate.findMany({
        where: {
          rateDate: {
            lte: rateDateEnd,
          },
        },
        orderBy: {
          rateDate: 'desc',
        },
      });
    }

    const closingRateMap = new Map<string, number>();
    for (const cr of closingRates) {
      if (cr.securityName) {
        const secUpper = cr.securityName.trim().toUpperCase();
        closingRateMap.set(`${cr.exchangeId}_${secUpper}`, cr.rate);
        if (!closingRateMap.has(secUpper)) {
          closingRateMap.set(secUpper, cr.rate);
        }
      }
    }

    // 3. Group unsettled trades by (accountId + brokerId + scriptId + exchangeId + securityName)
    const groups = new Map<string, typeof unsettledTrades>();
    for (const t of unsettledTrades) {
      const brokerKey = t.brokerId || 'NO_BROKER';
      const secName = deriveSecurityName(
        t.securityName,
        t.script.shortName,
        t.script.fullName,
        t.expiry,
        t.callPut,
        t.strikePrice
      );

      const groupKey = `${t.accountId}_${brokerKey}_${t.scriptId}_${t.exchangeId}_${secName.toUpperCase()}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(t);
    }

    const preview: SettlementTradePreview[] = [];
    const errors: SettlementError[] = [];

    // 4. Process each group
    for (const groupTrades of Array.from(groups.values())) {
      const first = groupTrades[0];
      const secName = deriveSecurityName(
        first.securityName,
        first.script.shortName,
        first.script.fullName,
        first.expiry,
        first.callPut,
        first.strikePrice
      );

      let buyQty = 0;
      let buyVal = 0;
      let sellQty = 0;
      let sellVal = 0;

      for (const t of groupTrades) {
        const qty = t.quantity;
        const rate = t.clientRate ?? t.rate;
        if (t.transactionType === 'BUY') {
          buyQty += qty;
          buyVal += qty * rate;
        } else {
          sellQty += qty;
          sellVal += qty * rate;
        }
      }

      const netQty = buyQty - sellQty;
      if (Math.abs(netQty) < 0.0001) {
        // Group net position is flat (already settled by regular trades)
        continue;
      }

      // Check closing rate
      const closingRate =
        closingRateMap.get(`${first.exchangeId}_${secName.toUpperCase()}`) ??
        closingRateMap.get(secName.toUpperCase()) ??
        null;

      if (closingRate == null) {
        errors.push({
          securityName: secName,
          expiry: first.expiry,
          message: `Missing closing rate for security '${secName}' on settlement date ${closingRateDateStr}.`,
        });
        continue;
      }

      // Check expiry date
      const parsedExpiry = parseExpiryDateString(first.expiry);
      let isExpired = false;

      if (parsedExpiry) {
        if (parsedExpiry <= closingRateDateStr) {
          isExpired = true;
        }
      }

      const cfType = netQty > 0 ? 'SELL' : 'BUY';
      const bfType = netQty > 0 ? 'BUY' : 'SELL';
      const absQty = Math.abs(netQty);
      const currencyCode = (first.currencyCode || first.script.currency?.code || 'USD').toUpperCase();

      if (isExpired) {
        // ── SETTLEMENT TRADE (No BF next day) ──
        preview.push({
          tradeType: 'SETTLEMENT',
          tradeDate: closingRateDateStr,
          accountId: first.accountId,
          accountCode: first.account.code,
          accountName: first.account.name,
          brokerId: first.brokerId,
          brokerCode: first.broker?.code || null,
          brokerName: first.broker?.name || null,
          scriptId: first.scriptId,
          scriptShortName: first.script.shortName,
          scriptFullName: first.script.fullName,
          exchangeId: first.exchangeId,
          exchangeCode: first.exchange.code,
          securityName: secName,
          transactionType: cfType,
          quantity: absQty,
          rate: closingRate,
          expiry: first.expiry,
          currencyCode,
        });
      } else {
        // ── CARRY FORWARD TRADE (Same Day) ──
        preview.push({
          tradeType: 'CARRY_FORWARD',
          tradeDate: closingRateDateStr,
          accountId: first.accountId,
          accountCode: first.account.code,
          accountName: first.account.name,
          brokerId: first.brokerId,
          brokerCode: first.broker?.code || null,
          brokerName: first.broker?.name || null,
          scriptId: first.scriptId,
          scriptShortName: first.script.shortName,
          scriptFullName: first.script.fullName,
          exchangeId: first.exchangeId,
          exchangeCode: first.exchange.code,
          securityName: secName,
          transactionType: cfType,
          quantity: absQty,
          rate: closingRate,
          expiry: first.expiry,
          currencyCode,
        });

        // ── BACK FORWARD TRADE (Next Day) ──
        preview.push({
          tradeType: 'BACK_FORWARD',
          tradeDate: nextDayStr,
          accountId: first.accountId,
          accountCode: first.account.code,
          accountName: first.account.name,
          brokerId: first.brokerId,
          brokerCode: first.broker?.code || null,
          brokerName: first.broker?.name || null,
          scriptId: first.scriptId,
          scriptShortName: first.script.shortName,
          scriptFullName: first.script.fullName,
          exchangeId: first.exchangeId,
          exchangeCode: first.exchange.code,
          securityName: secName,
          transactionType: bfType,
          quantity: absQty,
          rate: closingRate,
          expiry: first.expiry,
          currencyCode,
        });
      }
    }

    return {
      preview,
      errors,
      settlementFromDate,
      settlementToDate: closingRateDateStr,
      unsettledTradesCount: unsettledTrades.length,
      unsettledTradeIds: unsettledTrades.map((t) => t.id),
    };
  }

  async executeSettlement(closingRateDateStr: string) {
    const computed = await this.computeSettlement(closingRateDateStr);

    if (computed.errors.length > 0) {
      throw new BadRequestException(
        `Cannot execute settlement: ${computed.errors.map((e) => e.message).join('; ')}`
      );
    }

    if (computed.unsettledTradesCount === 0) {
      throw new BadRequestException('No unsettled trades found up to this date.');
    }

    const closingDate = new Date(closingRateDateStr);
    closingDate.setUTCHours(23, 59, 59, 999);

    const sameDayTradeDate = new Date(closingRateDateStr);
    sameDayTradeDate.setUTCHours(12, 0, 0, 0);

    const nextDayTradeDate = new Date(closingRateDateStr);
    nextDayTradeDate.setUTCDate(nextDayTradeDate.getUTCDate() + 1);
    nextDayTradeDate.setUTCHours(12, 0, 0, 0);

    let cfCount = 0;
    let bfCount = 0;
    let settlementCount = 0;
    let ledgerEntriesCount = 0;

    return await prisma.$transaction(
      async (tx) => {
        // 1. Create Settlement master record
        const count = await tx.settlement.count();
        const settlementName = `Settlement ${count + 1}`;

        const settlement = await tx.settlement.create({
          data: {
            name: settlementName,
            fromDate: new Date(computed.settlementFromDate),
            toDate: new Date(computed.settlementToDate),
          },
        });

        // 2. Batch insert CF & Settlement trades (assigned to this settlement)
        const cfAndSettlement = computed.preview.filter(
          (p) => p.tradeType === 'CARRY_FORWARD' || p.tradeType === 'SETTLEMENT'
        );

        if (cfAndSettlement.length > 0) {
          const cfTradesData = cfAndSettlement.map((item, i) => {
            const prefix = item.tradeType === 'CARRY_FORWARD' ? 'CF' : 'SETTLE';
            if (item.tradeType === 'CARRY_FORWARD') cfCount++;
            else settlementCount++;

            return {
              tradeNumber: `${prefix}-${Date.now()}-${i + 1}`,
              tradeDate: sameDayTradeDate,
              accountId: item.accountId,
              brokerId: item.brokerId,
              scriptId: item.scriptId,
              exchangeId: item.exchangeId,
              transactionType: item.transactionType,
              quantity: item.quantity,
              rate: item.rate,
              clientRate: item.rate,
              brokerRate: item.rate,
              clientBrokerage: 0,
              brokerBrokerage: 0,
              profitTotal: 0,
              tradeType: item.tradeType,
              settlementId: settlement.id,
              source: 'SYSTEM',
              remarks: `${item.tradeType} trade for ${settlementName}`,
              securityName: item.securityName,
              expiry: item.expiry,
              currencyCode: item.currencyCode,
            };
          });

          await tx.trade.createMany({
            data: cfTradesData,
          });
        }

        // 3. Batch insert Back Forward trades (settlementId = null, active for next cycle)
        const bfTrades = computed.preview.filter((p) => p.tradeType === 'BACK_FORWARD');
        if (bfTrades.length > 0) {
          const bfTradesData = bfTrades.map((item, i) => {
            bfCount++;
            return {
              tradeNumber: `BF-${Date.now()}-${i + 1}`,
              tradeDate: nextDayTradeDate,
              accountId: item.accountId,
              brokerId: item.brokerId,
              scriptId: item.scriptId,
              exchangeId: item.exchangeId,
              transactionType: item.transactionType,
              quantity: item.quantity,
              rate: item.rate,
              clientRate: item.rate,
              brokerRate: item.rate,
              clientBrokerage: 0,
              brokerBrokerage: 0,
              profitTotal: 0,
              tradeType: 'BACK_FORWARD',
              settlementId: null, // Open/live for next cycle
              source: 'SYSTEM',
              remarks: `Back forward trade from ${settlementName}`,
              securityName: item.securityName,
              expiry: item.expiry,
              currencyCode: item.currencyCode,
            };
          });

          await tx.trade.createMany({
            data: bfTradesData,
          });
        }

        // 4. Tag all previously unsettled trades with this settlementId
        if (computed.unsettledTradeIds && computed.unsettledTradeIds.length > 0) {
          await tx.trade.updateMany({
            where: {
              id: { in: computed.unsettledTradeIds },
            },
            data: {
              settlementId: settlement.id,
            },
          });
        }

        // 5. Create Ledger entries per Client and per Broker (lean select projection)
        const settledTrades = await tx.trade.findMany({
          where: {
            settlementId: settlement.id,
          },
          select: {
            accountId: true,
            brokerId: true,
            quantity: true,
            rate: true,
            clientRate: true,
            brokerRate: true,
            transactionType: true,
          },
        });

        const clientTotals = new Map<string, number>();
        const brokerTotals = new Map<string, number>();

        for (const t of settledTrades) {
          const clientRate = t.clientRate ?? t.rate;
          const brokerRate = t.brokerRate ?? t.rate;
          const clientVal = t.quantity * clientRate;
          const brokerVal = t.quantity * brokerRate;

          const clientSignedVal = t.transactionType === 'SELL' ? clientVal : -clientVal;
          clientTotals.set(t.accountId, (clientTotals.get(t.accountId) || 0) + clientSignedVal);

          if (t.brokerId) {
            const brokerSignedVal = t.transactionType === 'BUY' ? brokerVal : -brokerVal;
            brokerTotals.set(t.brokerId, (brokerTotals.get(t.brokerId) || 0) + brokerSignedVal);
          }
        }

        const ledgerDataToInsert: Array<{
          accountId: string;
          date: Date;
          amount: number;
          entryType: string;
          description: string;
          referenceId: string;
        }> = [];

        // Prepare Ledger entries for clients
        for (const [clientId, amount] of Array.from(clientTotals.entries())) {
          if (Math.abs(amount) < 0.01) continue;
          ledgerDataToInsert.push({
            accountId: clientId,
            date: new Date(closingRateDateStr),
            amount: Number(amount.toFixed(2)),
            entryType: 'SETTLEMENT',
            description: `${settlementName} (${computed.settlementFromDate} to ${computed.settlementToDate})`,
            referenceId: settlement.id,
          });
          ledgerEntriesCount++;
        }

        // Prepare Ledger entries for brokers
        for (const [brokerId, amount] of Array.from(brokerTotals.entries())) {
          if (Math.abs(amount) < 0.01) continue;
          ledgerDataToInsert.push({
            accountId: brokerId,
            date: new Date(closingRateDateStr),
            amount: Number(amount.toFixed(2)),
            entryType: 'SETTLEMENT',
            description: `${settlementName} (${computed.settlementFromDate} to ${computed.settlementToDate})`,
            referenceId: settlement.id,
          });
          ledgerEntriesCount++;
        }

        if (ledgerDataToInsert.length > 0) {
          await tx.ledger.createMany({
            data: ledgerDataToInsert,
          });
        }

        return {
          settlement,
          cfCount,
          bfCount,
          settlementCount,
          ledgerEntriesCount,
        };
      },
      { maxWait: 15000, timeout: 60000 }
    );
  }
}

export const settlementEngine = new SettlementEngine();
