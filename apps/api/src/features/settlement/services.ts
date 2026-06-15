import { prisma } from '../../database';

export class SettlementService {
  async generateSummary(fromDate: string, toDate: string) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    // Fetch all trades in the date range
    const trades = await prisma.trade.findMany({
      where: {
        tradeDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        account: true,
        broker: true,
        script: true,
        exchange: true,
      },
    });

    // Generate legs for both clients and brokers
    const legs: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      role: 'CLIENT' | 'BROKER';
      scriptId: string;
      scriptShortName: string;
      scriptFullName: string;
      exchangeId: string;
      exchangeCode: string;
      expiry: string | null;
      type: 'BUY' | 'SELL';
      qty: number;
      rate: number;
    }> = [];

    for (const trade of trades) {
      const qty = trade.quantity;
      const clientRate = trade.clientRate ?? trade.rate;
      const brokerRate = trade.brokerRate ?? trade.rate;

      // 1. Client leg
      legs.push({
        accountId: trade.accountId,
        accountCode: trade.account.code,
        accountName: trade.account.name,
        role: 'CLIENT',
        scriptId: trade.scriptId,
        scriptShortName: trade.script.shortName,
        scriptFullName: trade.script.fullName,
        exchangeId: trade.exchangeId,
        exchangeCode: trade.exchange.code,
        expiry: trade.expiry,
        type: trade.transactionType as 'BUY' | 'SELL',
        qty,
        rate: clientRate,
      });

      // 2. Broker leg (if broker is present)
      if (trade.brokerId && trade.broker) {
        legs.push({
          accountId: trade.brokerId,
          accountCode: trade.broker.code,
          accountName: trade.broker.name,
          role: 'BROKER',
          scriptId: trade.scriptId,
          scriptShortName: trade.script.shortName,
          scriptFullName: trade.script.fullName,
          exchangeId: trade.exchangeId,
          exchangeCode: trade.exchange.code,
          expiry: trade.expiry,
          type: trade.transactionType === 'BUY' ? 'SELL' : 'BUY',
          qty,
          rate: brokerRate,
        });
      }
    }

    // Group legs by accountId, scriptId, exchangeId, expiry
    const groups = new Map<string, typeof legs>();

    for (const leg of legs) {
      const key = `${leg.accountId}_${leg.scriptId}_${leg.exchangeId}_${leg.expiry || ''}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(leg);
    }

    // Fetch closing rates on the toDate
    const rateDateStart = new Date(toDate);
    rateDateStart.setHours(0, 0, 0, 0);
    const rateDateEnd = new Date(toDate);
    rateDateEnd.setHours(23, 59, 59, 999);

    const closingRates = await prisma.closingRate.findMany({
      where: {
        rateDate: {
          gte: rateDateStart,
          lte: rateDateEnd,
        },
      },
    });

    const closingRateMap = new Map<string, number>();
    for (const cr of closingRates) {
      closingRateMap.set(`${cr.exchangeId}_${cr.scriptId}`, cr.rate);
    }

    const summary: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      role: 'CLIENT' | 'BROKER';
      scriptId: string;
      scriptShortName: string;
      scriptFullName: string;
      exchangeId: string;
      exchangeCode: string;
      expiry: string | null;
      buyQty: number;
      buyVal: number;
      buyAvgRate: number;
      sellQty: number;
      sellVal: number;
      sellAvgRate: number;
      netQty: number;
      netVal: number;
      netAvgRate: number;
      realizedPnL: number;
      closingRate: number | null;
    }> = [];

    for (const [_, groupLegs] of groups.entries()) {
      let buyQty = 0;
      let buyVal = 0;
      let sellQty = 0;
      let sellVal = 0;

      const firstLeg = groupLegs[0];

      for (const leg of groupLegs) {
        if (leg.type === 'BUY') {
          buyQty += leg.qty;
          buyVal += leg.qty * leg.rate;
        } else {
          sellQty += leg.qty;
          sellVal += leg.qty * leg.rate;
        }
      }

      const buyAvgRate = buyQty > 0 ? buyVal / buyQty : 0;
      const sellAvgRate = sellQty > 0 ? sellVal / sellQty : 0;
      const netQty = buyQty - sellQty;
      const netVal = buyVal - sellVal;

      // Realized profit calculation
      let realizedPnL = 0;
      if (netQty === 0) {
        realizedPnL = sellVal - buyVal;
      } else if (netQty > 0) {
        realizedPnL = (sellAvgRate - buyAvgRate) * sellQty;
      } else {
        realizedPnL = (sellAvgRate - buyAvgRate) * buyQty;
      }

      let netAvgRate = 0;
      if (netQty !== 0) {
        netAvgRate = Math.abs(netVal / netQty);
      }

      const closingRate = closingRateMap.get(`${firstLeg.exchangeId}_${firstLeg.scriptId}`) ?? null;

      summary.push({
        accountId: firstLeg.accountId,
        accountCode: firstLeg.accountCode,
        accountName: firstLeg.accountName,
        role: firstLeg.role,
        scriptId: firstLeg.scriptId,
        scriptShortName: firstLeg.scriptShortName,
        scriptFullName: firstLeg.scriptFullName,
        exchangeId: firstLeg.exchangeId,
        exchangeCode: firstLeg.exchangeCode,
        expiry: firstLeg.expiry,
        buyQty,
        buyVal,
        buyAvgRate: Number(buyAvgRate.toFixed(4)),
        sellQty,
        sellVal,
        sellAvgRate: Number(sellAvgRate.toFixed(4)),
        netQty,
        netVal,
        netAvgRate: Number(netAvgRate.toFixed(4)),
        realizedPnL: Number(realizedPnL.toFixed(4)),
        closingRate,
      });
    }

    return summary;
  }
}

export const settlementService = new SettlementService();
