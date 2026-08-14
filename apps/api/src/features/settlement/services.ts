import { prisma } from '../../database';

export class SettlementService {
  async generateSummary(fromDate: string, toDate: string) {
    const start = new Date(fromDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(toDate);
    end.setUTCHours(23, 59, 59, 999);

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
        script: {
          include: { currency: true }
        },
        exchange: true,
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

    // Fetch closing rates on the toDate
    const rateDateStart = new Date(toDate);
    rateDateStart.setUTCHours(0, 0, 0, 0);
    const rateDateEnd = new Date(toDate);
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
    const reportDateObj = new Date(data.reportDate);
    const sameDayDate = new Date(reportDateObj);
    sameDayDate.setUTCHours(12, 0, 0, 0);

    const nextDayDate = new Date(reportDateObj);
    nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1);
    nextDayDate.setUTCHours(12, 0, 0, 0);

    let createdCount = 0;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < data.adjustments.length; i++) {
        const adj = data.adjustments[i];
        if (adj.netQty === 0) continue;

        const qty = Math.abs(adj.netQty);
        const rate = Number(adj.closingRate) || 0;

        // 1. Same-day Carry Forward trade (inverts position)
        const cfType = adj.netQty > 0 ? 'SELL' : 'BUY';
        await tx.trade.create({
          data: {
            tradeNumber: `CF-${Date.now()}-${i + 1}`,
            tradeDate: sameDayDate,
            accountId: adj.accountId,
            scriptId: adj.scriptId,
            exchangeId: adj.exchangeId,
            transactionType: cfType,
            quantity: qty,
            rate: rate,
            clientRate: rate,
            brokerRate: rate,
            clientBrokerage: 0,
            brokerBrokerage: 0,
            profitTotal: 0,
            source: 'SETTLEMENT_CARRY_FORWARD',
            remarks: 'Carry forward settlement closing trade',
            securityName: adj.securityName || null,
            expiry: adj.expiry || null,
          },
        });
        createdCount++;

        // 2. Next-day Back Forward trade (re-opens position on next day)
        const bfType = adj.netQty > 0 ? 'BUY' : 'SELL';
        await tx.trade.create({
          data: {
            tradeNumber: `BF-${Date.now()}-${i + 1}`,
            tradeDate: nextDayDate,
            accountId: adj.accountId,
            scriptId: adj.scriptId,
            exchangeId: adj.exchangeId,
            transactionType: bfType,
            quantity: qty,
            rate: rate,
            clientRate: rate,
            brokerRate: rate,
            clientBrokerage: 0,
            brokerBrokerage: 0,
            profitTotal: 0,
            source: 'SETTLEMENT_BACK_FORWARD',
            remarks: 'Back forward settlement opening trade',
            securityName: adj.securityName || null,
            expiry: adj.expiry || null,
          },
        });
        createdCount++;
      }
    });

    return { createdCount };
  }
}

export const settlementService = new SettlementService();
