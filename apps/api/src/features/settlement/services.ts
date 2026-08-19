import { prisma } from '../../database';
import { settlementEngine } from './engine';

export class SettlementService {
  async listSettlements() {
    return prisma.settlement.findMany({
      orderBy: {
        toDate: 'desc',
      },
      include: {
        _count: {
          select: { trades: true },
        },
      },
    });
  }

  async getSettlement(id: string) {
    return prisma.settlement.findUnique({
      where: { id },
      include: {
        trades: {
          include: {
            account: true,
            broker: true,
            script: { include: { currency: true } },
            exchange: true,
          },
        },
      },
    });
  }

  async previewSettlement(closingRateDate: string) {
    return settlementEngine.computeSettlement(closingRateDate);
  }

  async executeSettlement(closingRateDate: string) {
    return settlementEngine.executeSettlement(closingRateDate);
  }

  async generateSummary(fromDate?: string, toDate?: string, settlementId?: string | null) {
    let whereClause: any = {};

    if (settlementId === 'UNSETTLED' || settlementId === 'LIVE') {
      whereClause.settlementId = null;
      if (toDate) {
        const end = new Date(toDate);
        end.setUTCHours(23, 59, 59, 999);
        whereClause.tradeDate = { lte: end };
      }
    } else if (settlementId) {
      whereClause.settlementId = settlementId;
    } else if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);

      whereClause.tradeDate = {
        gte: start,
        lte: end,
      };
    } else if (toDate) {
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      whereClause.tradeDate = { lte: end };
    }

    // Fetch all matching trades
    const trades = await prisma.trade.findMany({
      where: whereClause,
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

    // Fetch currency map
    const currencies = await prisma.currency.findMany();
    const currencySymbolMap = new Map<string, string>();
    for (const c of currencies) {
      currencySymbolMap.set(c.code.toUpperCase(), c.symbol || c.code);
    }

    // Generate legs for both clients and brokers
    const legs: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      role: 'CLIENT' | 'BROKER';
      securityName: string;
      scriptId: string;
      scriptShortName: string;
      scriptFullName: string;
      exchangeId: string;
      exchangeCode: string;
      currencyCode: string;
      currencySymbol: string;
      expiry: string | null;
      type: 'BUY' | 'SELL';
      qty: number;
      rate: number;
    }> = [];

    for (const trade of trades) {
      const qty = trade.quantity;
      const clientRate = trade.clientRate ?? trade.rate;
      const brokerRate = trade.brokerRate ?? trade.rate;

      const currencyCode = (trade.currencyCode || trade.script.currency?.code || 'USD').toUpperCase();
      const currencySymbol = currencySymbolMap.get(currencyCode) || trade.script.currency?.symbol || '$';

      const baseScriptName = trade.script.fullName || trade.script.shortName;
      let derivedSecurityName = trade.securityName?.trim() || '';

      if (
        !derivedSecurityName ||
        derivedSecurityName.toUpperCase() === trade.script.shortName.toUpperCase() ||
        derivedSecurityName.toUpperCase() === (trade.script.fullName || '').toUpperCase()
      ) {
        derivedSecurityName = trade.expiry
          ? `${baseScriptName} ${trade.expiry}`
          : baseScriptName;
      }

      // 1. Client leg
      legs.push({
        accountId: trade.accountId,
        accountCode: trade.account.code,
        accountName: trade.account.name,
        role: 'CLIENT',
        securityName: derivedSecurityName,
        scriptId: trade.scriptId,
        scriptShortName: trade.script.shortName,
        scriptFullName: trade.script.fullName,
        exchangeId: trade.exchangeId,
        exchangeCode: trade.exchange.code,
        currencyCode,
        currencySymbol,
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
          securityName: derivedSecurityName,
          scriptId: trade.scriptId,
          scriptShortName: trade.script.shortName,
          scriptFullName: trade.script.fullName,
          exchangeId: trade.exchangeId,
          exchangeCode: trade.exchange.code,
          currencyCode,
          currencySymbol,
          expiry: trade.expiry,
          type: trade.transactionType === 'BUY' ? 'SELL' : 'BUY',
          qty,
          rate: brokerRate,
        });
      }
    }

    // Group legs by (AccountId + SecurityName)
    const groups = new Map<string, typeof legs>();
    for (const leg of legs) {
      const key = `${leg.accountId}_${leg.securityName.toUpperCase()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(leg);
    }

    // Fetch closing rates on the toDate (or latest date)
    const rateDateTarget = toDate ? new Date(toDate) : new Date();
    const rateDateStart = new Date(rateDateTarget);
    rateDateStart.setUTCHours(0, 0, 0, 0);
    const rateDateEnd = new Date(rateDateTarget);
    rateDateEnd.setUTCHours(23, 59, 59, 999);

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
      if (cr.securityName) {
        closingRateMap.set(`${cr.exchangeId}_${cr.securityName.trim().toUpperCase()}`, cr.rate);
      }
      if (cr.scriptId) {
        closingRateMap.set(`${cr.exchangeId}_${cr.scriptId}`, cr.rate);
      }
    }

    const summary: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      role: 'CLIENT' | 'BROKER';
      securityName: string;
      scriptId: string;
      scriptShortName: string;
      scriptFullName: string | null;
      exchangeId: string;
      exchangeCode: string;
      currencyCode: string;
      currencySymbol: string;
      expiry: string | null;
      buyQty: number;
      buyAvgRate: number;
      buyTotalAmount: number;
      sellQty: number;
      sellAvgRate: number;
      sellTotalAmount: number;
      netQty: number;
      netAvgRate: number;
      closingRate: number | null;
      realizedPnL: number;
      unrealizedPnL: number;
      grossPnL: number;
    }> = [];

    for (const legGroup of Array.from(groups.values())) {
      const firstLeg = legGroup[0];

      let buyQty = 0;
      let buyVal = 0;
      let sellQty = 0;
      let sellVal = 0;

      for (const leg of legGroup) {
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

      let realizedPnL = 0;
      if (buyQty >= sellQty) {
        realizedPnL = (sellAvgRate - buyAvgRate) * sellQty;
      } else {
        realizedPnL = (sellAvgRate - buyAvgRate) * buyQty;
      }

      let netAvgRate = 0;
      if (netQty !== 0) {
        netAvgRate = Math.abs(netVal / netQty);
      }

      const closingRate =
        closingRateMap.get(`${firstLeg.exchangeId}_${firstLeg.securityName.trim().toUpperCase()}`) ??
        closingRateMap.get(`${firstLeg.exchangeId}_${firstLeg.scriptId}`) ??
        null;

      const unrealizedPnL = closingRate && netQty !== 0 ? netQty * (closingRate - netAvgRate) : 0;
      const grossPnL = realizedPnL + unrealizedPnL;

      summary.push({
        accountId: firstLeg.accountId,
        accountCode: firstLeg.accountCode,
        accountName: firstLeg.accountName,
        role: firstLeg.role,
        securityName: firstLeg.securityName,
        scriptId: firstLeg.scriptId,
        scriptShortName: firstLeg.scriptShortName,
        scriptFullName: firstLeg.scriptFullName,
        exchangeId: firstLeg.exchangeId,
        exchangeCode: firstLeg.exchangeCode,
        currencyCode: firstLeg.currencyCode,
        currencySymbol: firstLeg.currencySymbol,
        expiry: firstLeg.expiry,
        buyQty,
        buyAvgRate: Number(buyAvgRate.toFixed(4)),
        buyTotalAmount: Number(buyVal.toFixed(2)),
        sellQty,
        sellAvgRate: Number(sellAvgRate.toFixed(4)),
        sellTotalAmount: Number(sellVal.toFixed(2)),
        netQty,
        netAvgRate: Number(netAvgRate.toFixed(4)),
        closingRate,
        realizedPnL: Number(realizedPnL.toFixed(4)),
        unrealizedPnL: Number(unrealizedPnL.toFixed(4)),
        grossPnL: Number(grossPnL.toFixed(4)),
      });
    }

    return summary;
  }

  async adjustTrades(data: {
    reportDate: string;
    adjustments: Array<{
      accountId: string;
      scriptId: string;
      exchangeId: string;
      netQty: number;
      closingRate: number;
      securityName?: string;
      expiry?: string | null;
    }>;
  }) {
    return settlementEngine.executeSettlement(data.reportDate);
  }
}

export const settlementService = new SettlementService();

