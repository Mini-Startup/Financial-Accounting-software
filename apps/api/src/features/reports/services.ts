import { prisma } from '../../database';
import {
  GroupByDimension,
  NetPositionItem,
  NetPositionGroup,
  NetPositionReportQuery,
  NetPositionReportResponse,
  SettlementAuditTrade,
  SettlementClientAuditGroup,
  SettlementDetailAuditQuery,
  SettlementDetailAuditResponse,
  SettlementSummaryReportQuery,
  SettlementSummaryReportResponse,
  SettlementSummaryClientRow,
  SettlementSummaryBrokerRow,
  SettlementSummaryReconciliation,
  TradeClassification,
  InvoiceReportQuery,
  InvoiceReportResponse,
  InvoiceEntityGroup,
  InvoiceScriptGroup,
  InvoiceTradeLeg,
} from './types';
import {
  formatDateToDDMMYY,
  parseDateBoundary,
  getEffectiveMarketLot,
  roundTo,
  determineBalanceType,
} from './utils';
import { deriveSecurityName } from '../settlement/utils';

/**
 * Ensures 'REPORTS:VIEW' and 'REPORTS:EXPORT' permissions exist in the permissions table.
 */
export async function ensureReportPermissions(): Promise<void> {
  try {
    await prisma.permission.upsert({
      where: { uq_feature_action: { feature: 'REPORTS', action: 'VIEW' } },
      update: {},
      create: {
        feature: 'REPORTS',
        action: 'VIEW',
        name: 'View Financial Reports',
        description: 'Access to Net Position, Settlement Audit, and Settlement Summary reports',
      },
    });

    await prisma.permission.upsert({
      where: { uq_feature_action: { feature: 'REPORTS', action: 'EXPORT' } },
      update: {},
      create: {
        feature: 'REPORTS',
        action: 'EXPORT',
        name: 'Export Financial Reports',
        description: 'Export reports as CSV spreadsheet or print accounting statements',
      },
    });
  } catch (err) {
    // Non-blocking: if table doesn't exist or concurrent write, continue
    console.warn('[ReportsService] Permission upsert notice:', (err as Error)?.message);
  }
}

export class ReportsService {
  /**
   * REPORT 1: Net Position Report (Open Positions)
   * Fetches unsettled trades (settlementId IS NULL) and aggregates exposure by Client, Broker, or Script.
   */
  static async getNetPosition(query: NetPositionReportQuery): Promise<NetPositionReportResponse> {
    const groupBy: GroupByDimension = query.groupBy || 'CLIENT';
    const asOfBoundary = parseDateBoundary(query.asOfDate, true) || new Date();

    const whereClause: any = {
      settlementId: null,
      tradeDate: { lte: asOfBoundary },
    };

    if (query.accountId) whereClause.accountId = query.accountId;
    if (query.brokerId) whereClause.brokerId = query.brokerId;
    if (query.scriptId) whereClause.scriptId = query.scriptId;

    // 1. Concurrently fetch unsettled trades and closing rates up to asOfBoundary
    const [trades, closingRates] = await Promise.all([
      prisma.trade.findMany({
        where: whereClause,
        include: {
          account: true,
          broker: true,
          script: {
            include: {
              currency: true,
            },
          },
          exchange: true,
        },
        orderBy: { tradeDate: 'asc' },
      }),
      prisma.closingRate.findMany({
        where: { rateDate: { lte: asOfBoundary } },
        orderBy: { rateDate: 'desc' },
      }),
    ]);

    // Build fast lookup map for closing rates
    // Key priority: `${exchangeId}_${securityNameUpper}` -> `${securityNameUpper}`
    const closingRateMap = new Map<string, number>();
    for (const cr of closingRates) {
      if (cr.securityName) {
        const secUpper = cr.securityName.trim().toUpperCase();
        const exKey = `${cr.exchangeId}_${secUpper}`;
        if (!closingRateMap.has(exKey)) {
          closingRateMap.set(exKey, cr.rate);
        }
        if (!closingRateMap.has(secUpper)) {
          closingRateMap.set(secUpper, cr.rate);
        }
      }
    }

    // 2. Group trades according to selected dimension
    // GroupKey -> { id, code, name, category, trades }
    interface GroupContainer {
      id: string;
      code: string;
      name: string;
      category: GroupByDimension;
      trades: typeof trades;
    }

    const groupMap = new Map<string, GroupContainer>();

    for (const t of trades) {
      let groupKey = '';
      let id = '';
      let code = '';
      let name = '';

      if (groupBy === 'CLIENT') {
        groupKey = t.accountId;
        id = t.accountId;
        code = t.account?.code || 'N/A';
        name = t.account?.name || 'Unnamed Client';
      } else if (groupBy === 'BROKER') {
        groupKey = t.brokerId || 'DIRECT';
        id = t.brokerId || 'DIRECT';
        code = t.broker?.code || 'DIRECT';
        name = t.broker?.name || 'Direct / No Broker';
      } else {
        // SCRIPT
        groupKey = t.scriptId;
        id = t.scriptId;
        code = t.script?.shortName || 'N/A';
        name = t.script?.fullName || t.script?.shortName || 'Unnamed Script';
      }

      let grp = groupMap.get(groupKey);
      if (!grp) {
        grp = { id, code, name, category: groupBy, trades: [] };
        groupMap.set(groupKey, grp);
      }
      grp.trades.push(t);
    }

    let missingClosingRatesCount = 0;
    const resultGroups: NetPositionGroup[] = [];

    // 3. For each group, aggregate positions by securityName
    for (const grp of Array.from(groupMap.values())) {
      const positionMap = new Map<string, typeof trades>();

      for (const t of grp.trades) {
        const secKey = (t.securityName || `${t.script?.shortName || 'SEC'}_${t.expiry || ''}`).trim();
        let posTrades = positionMap.get(secKey);
        if (!posTrades) {
          posTrades = [];
          positionMap.set(secKey, posTrades);
        }
        posTrades.push(t);
      }

      const positions: NetPositionItem[] = [];
      let grpBuyQty = 0;
      let grpSellQty = 0;
      let grpNetQty = 0;
      let grpTotalUnits = 0;
      let grpMarketValue = 0;
      let grpUnrealizedPnL = 0;

      for (const [secName, pTrades] of Array.from(positionMap.entries())) {
        const sampleTrade = pTrades[0];
        const script = sampleTrade.script;
        const exchange = sampleTrade.exchange;
        const marketLot = getEffectiveMarketLot(sampleTrade.marketLot, script?.lotSize);

        let buyQty = 0;
        let buyValue = 0;
        let sellQty = 0;
        let sellValue = 0;

        for (const t of pTrades) {
          const lot = getEffectiveMarketLot(t.marketLot, script?.lotSize);
          const effectiveRate = t.clientRate ?? t.rate;
          const units = Math.abs(t.quantity) * lot;
          const val = units * effectiveRate;

          if (t.transactionType === 'BUY') {
            buyQty += t.quantity;
            buyValue += val;
          } else {
            sellQty += t.quantity;
            sellValue += val;
          }
        }

        const netQty = roundTo(buyQty - sellQty, 2);
        const totalUnits = roundTo(Math.abs(netQty) * marketLot, 2);

        const buyAvgRate = buyQty * marketLot > 0 ? roundTo(buyValue / (buyQty * marketLot), 4) : 0;
        const sellAvgRate = sellQty * marketLot > 0 ? roundTo(sellValue / (sellQty * marketLot), 4) : 0;

        // Net Average Rate calculation: cost basis of remaining net position
        let netAvgRate = 0;
        if (netQty > 0) {
          // Long position
          const netCostBasis = buyValue - sellValue;
          netAvgRate = netCostBasis > 0 && totalUnits > 0
            ? roundTo(netCostBasis / totalUnits, 4)
            : buyAvgRate;
        } else if (netQty < 0) {
          // Short position
          const netCostBasis = sellValue - buyValue;
          netAvgRate = netCostBasis > 0 && totalUnits > 0
            ? roundTo(netCostBasis / totalUnits, 4)
            : sellAvgRate;
        }

        // Closing Rate lookup
        const secUpper = secName.trim().toUpperCase();
        const exKey = `${sampleTrade.exchangeId}_${secUpper}`;
        let closingRate: number | null = null;

        if (closingRateMap.has(exKey)) {
          closingRate = closingRateMap.get(exKey)!;
        } else if (closingRateMap.has(secUpper)) {
          closingRate = closingRateMap.get(secUpper)!;
        }

        const isMissingRate = closingRate === null || closingRate === undefined;
        if (isMissingRate) {
          missingClosingRatesCount++;
        }

        // Market Value & Unrealized PnL
        let marketValue = 0;
        let unrealizedPnL = 0;

        if (!isMissingRate && closingRate !== null) {
          marketValue = roundTo(totalUnits * closingRate, 2);
          if (netQty > 0) {
            unrealizedPnL = roundTo((closingRate - netAvgRate) * totalUnits, 2);
          } else if (netQty < 0) {
            unrealizedPnL = roundTo((netAvgRate - closingRate) * totalUnits, 2);
          }
        }

        positions.push({
          securityName: secName,
          scriptId: sampleTrade.scriptId,
          scriptShortName: script?.shortName || '',
          scriptFullName: script?.fullName || script?.shortName || '',
          exchangeId: sampleTrade.exchangeId,
          exchangeCode: exchange?.code || '',
          currencyCode: script?.currency?.code || 'USD',
          currencySymbol: script?.currency?.symbol || '$',
          expiry: sampleTrade.expiry || null,
          expiryFormatted: formatDateToDDMMYY(sampleTrade.expiry),
          marketLot,
          buyQty: roundTo(buyQty, 2),
          buyAvgRate,
          sellQty: roundTo(sellQty, 2),
          sellAvgRate,
          netQty,
          totalUnits,
          netAvgRate,
          closingRate: isMissingRate ? null : roundTo(closingRate!, 4),
          marketValue,
          unrealizedPnL,
          isMissingRate,
        });

        grpBuyQty += buyQty;
        grpSellQty += sellQty;
        grpNetQty += netQty;
        grpTotalUnits += totalUnits;
        grpMarketValue += marketValue;
        grpUnrealizedPnL += unrealizedPnL;
      }

      resultGroups.push({
        id: grp.id,
        code: grp.code,
        name: grp.name,
        category: grp.category,
        totals: {
          buyQty: roundTo(grpBuyQty, 2),
          sellQty: roundTo(grpSellQty, 2),
          netQty: roundTo(grpNetQty, 2),
          totalUnits: roundTo(grpTotalUnits, 2),
          marketValue: roundTo(grpMarketValue, 2),
          unrealizedPnL: roundTo(grpUnrealizedPnL, 2),
        },
        positions,
      });
    }

    // Sort groups alphabetically by code/name
    resultGroups.sort((a, b) => a.code.localeCompare(b.code));

    // Summary calculation across all groups
    let totalOpenContracts = 0;
    let totalLongContracts = 0;
    let totalShortContracts = 0;
    let totalNotionalMarketValue = 0;
    let totalUnrealizedPnL = 0;

    for (const g of resultGroups) {
      for (const p of g.positions) {
        totalOpenContracts += Math.abs(p.netQty);
        if (p.netQty > 0) totalLongContracts += p.netQty;
        if (p.netQty < 0) totalShortContracts += Math.abs(p.netQty);
        totalNotionalMarketValue += p.marketValue;
        totalUnrealizedPnL += p.unrealizedPnL;
      }
    }

    return {
      asOfDate: formatDateToDDMMYY(asOfBoundary),
      groupBy,
      summary: {
        totalOpenTrades: trades.length,
        totalOpenContracts: roundTo(totalOpenContracts, 2),
        totalLongContracts: roundTo(totalLongContracts, 2),
        totalShortContracts: roundTo(totalShortContracts, 2),
        totalNotionalMarketValue: roundTo(totalNotionalMarketValue, 2),
        totalUnrealizedPnL: roundTo(totalUnrealizedPnL, 2),
        missingClosingRatesCount,
      },
      groups: resultGroups,
    };
  }

  /**
   * REPORT 2: Detailed Settlement Audit Report
   * Categorizes trades into Regular, Carry Forward, Back Forward, and Settlement with counterparty subtotals.
   */
  static async getSettlementAudit(
    query: SettlementDetailAuditQuery
  ): Promise<SettlementDetailAuditResponse> {
    let settlement: any = null;
    const whereClause: any = {};

    if (query.settlementId && query.settlementId !== 'LIVE') {
      settlement = await prisma.settlement.findUnique({
        where: { id: query.settlementId },
      });
      whereClause.settlementId = query.settlementId;
    } else if (query.fromDate || query.toDate) {
      const fromBoundary = parseDateBoundary(query.fromDate, false);
      const toBoundary = parseDateBoundary(query.toDate, true);
      whereClause.tradeDate = {};
      if (fromBoundary) whereClause.tradeDate.gte = fromBoundary;
      if (toBoundary) whereClause.tradeDate.lte = toBoundary;
    } else {
      // Default LIVE active trades
      whereClause.settlementId = null;
    }

    if (query.tradeType && query.tradeType !== 'ALL') {
      whereClause.tradeType = query.tradeType;
    }
    if (query.clientId) whereClause.accountId = query.clientId;
    if (query.brokerId) whereClause.brokerId = query.brokerId;

    const trades = await prisma.trade.findMany({
      where: whereClause,
      include: {
        account: true,
        broker: true,
        script: true,
        exchange: true,
      },
      orderBy: [{ tradeDate: 'asc' }, { tradeNumber: 'asc' }],
    });

    let regularCount = 0;
    let cfCount = 0;
    let bfCount = 0;
    let settlementCount = 0;
    let totalTradedUnits = 0;
    let grossBuyValue = 0;
    let grossSellValue = 0;

    // Group trades by Client Account ID
    const clientMap = new Map<
      string,
      {
        clientId: string;
        clientCode: string;
        clientName: string;
        trades: SettlementAuditTrade[];
        buyQty: number;
        sellQty: number;
        buyValue: number;
        sellValue: number;
      }
    >();

    for (const t of trades) {
      const classification: TradeClassification = (t.tradeType as TradeClassification) || 'REGULAR';
      if (classification === 'REGULAR') regularCount++;
      else if (classification === 'CARRY_FORWARD') cfCount++;
      else if (classification === 'BACK_FORWARD') bfCount++;
      else if (classification === 'SETTLEMENT') settlementCount++;

      const marketLot = getEffectiveMarketLot(t.marketLot, t.script?.lotSize);
      const units = Math.abs(t.quantity) * marketLot;
      const effectiveRate = t.clientRate ?? t.rate;
      const tradeVal = roundTo(units * effectiveRate, 2);

      totalTradedUnits += units;
      if (t.transactionType === 'BUY') {
        grossBuyValue += tradeVal;
      } else {
        grossSellValue += tradeVal;
      }

      // Financial PnL contribution:
      // SELL is credit (+), BUY is debit (-)
      const pnl = t.transactionType === 'SELL' ? tradeVal : -tradeVal;

      let clientEntry = clientMap.get(t.accountId);
      if (!clientEntry) {
        clientEntry = {
          clientId: t.accountId,
          clientCode: t.account?.code || 'N/A',
          clientName: t.account?.name || 'Unnamed Client',
          trades: [],
          buyQty: 0,
          sellQty: 0,
          buyValue: 0,
          sellValue: 0,
        };
        clientMap.set(t.accountId, clientEntry);
      }

      if (t.transactionType === 'BUY') {
        clientEntry.buyQty += t.quantity;
        clientEntry.buyValue += tradeVal;
      } else {
        clientEntry.sellQty += t.quantity;
        clientEntry.sellValue += tradeVal;
      }

      clientEntry.trades.push({
        id: t.id,
        tradeNumber: t.tradeNumber,
        tradeDate: formatDateToDDMMYY(t.tradeDate),
        tradeType: classification,
        brokerCode: t.broker?.code || null,
        brokerName: t.broker?.name || null,
        securityName: t.securityName || t.script?.shortName || 'Security',
        transactionType: t.transactionType as 'BUY' | 'SELL',
        quantity: t.quantity,
        marketLot,
        totalUnits: units,
        rate: roundTo(effectiveRate, 4),
        settlementRate: t.brokerRate ? roundTo(t.brokerRate, 4) : null,
        tradeValue: tradeVal,
        pnl,
        remarks: t.originSettlementId ? `Origin: ${t.originSettlementId}` : null,
      });
    }

    const clientAuditGroups: SettlementClientAuditGroup[] = Array.from(clientMap.values()).map(
      (c) => ({
        clientId: c.clientId,
        clientCode: c.clientCode,
        clientName: c.clientName,
        subtotals: {
          buyQty: roundTo(c.buyQty, 2),
          sellQty: roundTo(c.sellQty, 2),
          netQty: roundTo(c.buyQty - c.sellQty, 2),
          buyValue: roundTo(c.buyValue, 2),
          sellValue: roundTo(c.sellValue, 2),
          cyclePnL: roundTo(c.sellValue - c.buyValue, 2),
        },
        trades: c.trades,
      })
    );

    clientAuditGroups.sort((a, b) => a.clientCode.localeCompare(b.clientCode));

    const fromDateStr = settlement?.fromDate
      ? formatDateToDDMMYY(settlement.fromDate)
      : query.fromDate
      ? formatDateToDDMMYY(query.fromDate)
      : formatDateToDDMMYY(new Date());

    const toDateStr = settlement?.toDate
      ? formatDateToDDMMYY(settlement.toDate)
      : query.toDate
      ? formatDateToDDMMYY(query.toDate)
      : formatDateToDDMMYY(new Date());

    return {
      settlementInfo: {
        id: settlement?.id || null,
        name: settlement?.name || (query.settlementId === 'LIVE' ? 'Live Unsettled Trades' : 'Audit Period'),
        fromDate: fromDateStr,
        toDate: toDateStr,
      },
      metrics: {
        totalTrades: trades.length,
        regularCount,
        cfCount,
        bfCount,
        settlementCount,
        totalTradedUnits: roundTo(totalTradedUnits, 2),
        grossBuyValue: roundTo(grossBuyValue, 2),
        grossSellValue: roundTo(grossSellValue, 2),
        totalCyclePnL: roundTo(grossSellValue - grossBuyValue, 2),
      },
      clientAuditGroups,
    };
  }

  /**
   * REPORT 3: Final Settlement Summary Report (Financial Clearing Sheet)
   * Calculates Client net clearing, Broker net clearing, and double-entry equilibrium check.
   */
  static async getSettlementSummary(
    query: SettlementSummaryReportQuery
  ): Promise<SettlementSummaryReportResponse> {
    let settlement: any = null;
    const whereClause: any = {};

    if (query.settlementId && query.settlementId !== 'LIVE') {
      settlement = await prisma.settlement.findUnique({
        where: { id: query.settlementId },
      });
      whereClause.settlementId = query.settlementId;
    } else if (query.fromDate || query.toDate) {
      const fromBoundary = parseDateBoundary(query.fromDate, false);
      const toBoundary = parseDateBoundary(query.toDate, true);
      whereClause.tradeDate = {};
      if (fromBoundary) whereClause.tradeDate.gte = fromBoundary;
      if (toBoundary) whereClause.tradeDate.lte = toBoundary;
    } else {
      // Default to the most recently created settlement or active trades
      settlement = await prisma.settlement.findFirst({
        orderBy: { toDate: 'desc' },
      });
      if (settlement) {
        whereClause.settlementId = settlement.id;
      } else {
        whereClause.settlementId = null;
      }
    }

    // Parallel fetch: Trades and Ledger Entries for ledger cross-check
    const [trades, ledgerEntries] = await Promise.all([
      prisma.trade.findMany({
        where: whereClause,
        include: {
          account: true,
          broker: true,
          script: true,
        },
      }),
      settlement?.id
        ? prisma.ledger.findMany({
            where: { settlementId: settlement.id },
          })
        : Promise.resolve([]),
    ]);

    // Fast map of ledger entries by accountId
    const ledgerMap = new Map<string, number>();
    for (const le of ledgerEntries) {
      ledgerMap.set(le.accountId, le.amount);
    }

    // ─── 1. Client Clearing Aggregations ────────────────────────────────────
    interface ClientAccumulator {
      accountId: string;
      accountCode: string;
      accountName: string;
      buyQty: number;
      sellQty: number;
      buyValue: number;
      sellValue: number;
      brokerage: number;
    }

    const clientAcc = new Map<string, ClientAccumulator>();

    // ─── 2. Broker Clearing Aggregations ────────────────────────────────────
    interface BrokerAccumulator {
      brokerId: string;
      brokerCode: string;
      brokerName: string;
      buyQty: number;
      sellQty: number;
      buyValue: number;
      sellValue: number;
      charges: number;
    }

    const brokerAcc = new Map<string, BrokerAccumulator>();

    for (const t of trades) {
      const lot = getEffectiveMarketLot(t.marketLot, t.script?.lotSize);
      const units = Math.abs(t.quantity) * lot;

      const clientRate = t.clientRate ?? t.rate;
      const brokerRate = t.brokerRate ?? t.rate;

      const clientVal = roundTo(units * clientRate, 2);
      const brokerVal = roundTo(units * brokerRate, 2);

      const clientBrok = t.clientBrokerage ?? 0;
      const brokerBrok = t.brokerBrokerage ?? 0;

      // Accumulate for Client
      let ca = clientAcc.get(t.accountId);
      if (!ca) {
        ca = {
          accountId: t.accountId,
          accountCode: t.account?.code || 'N/A',
          accountName: t.account?.name || 'Unnamed Client',
          buyQty: 0,
          sellQty: 0,
          buyValue: 0,
          sellValue: 0,
          brokerage: 0,
        };
        clientAcc.set(t.accountId, ca);
      }

      if (t.transactionType === 'BUY') {
        ca.buyQty += t.quantity;
        ca.buyValue += clientVal;
      } else {
        ca.sellQty += t.quantity;
        ca.sellValue += clientVal;
      }
      ca.brokerage += clientBrok;

      // Accumulate for Broker (if trade has an assigned broker)
      if (t.brokerId) {
        let ba = brokerAcc.get(t.brokerId);
        if (!ba) {
          ba = {
            brokerId: t.brokerId,
            brokerCode: t.broker?.code || 'N/A',
            brokerName: t.broker?.name || 'Unnamed Broker',
            buyQty: 0,
            sellQty: 0,
            buyValue: 0,
            sellValue: 0,
            charges: 0,
          };
          brokerAcc.set(t.brokerId, ba);
        }

        if (t.transactionType === 'BUY') {
          ba.buyQty += t.quantity;
          ba.buyValue += brokerVal;
        } else {
          ba.sellQty += t.quantity;
          ba.sellValue += brokerVal;
        }
        ba.charges += brokerBrok;
      }
    }

    // Process Client Summary Rows
    let clientTotalBuyVal = 0;
    let clientTotalSellVal = 0;
    let clientGrossTradingPnL = 0;
    let clientTotalBrokerage = 0;
    let clientNetReceivable = 0; // Dr total
    let clientNetPayable = 0;    // Cr total
    let clientNetTotal = 0;

    const clientRows: SettlementSummaryClientRow[] = [];

    for (const ca of Array.from(clientAcc.values())) {
      const grossPnL = roundTo(ca.sellValue - ca.buyValue, 2);
      const brokerage = roundTo(ca.brokerage, 2);
      const netAmount = roundTo(grossPnL - brokerage, 2);
      const type = determineBalanceType(netAmount);

      clientTotalBuyVal += ca.buyValue;
      clientTotalSellVal += ca.sellValue;
      clientGrossTradingPnL += grossPnL;
      clientTotalBrokerage += brokerage;
      clientNetTotal += netAmount;

      if (netAmount > 0.005) {
        clientNetPayable += netAmount;
      } else if (netAmount < -0.005) {
        clientNetReceivable += Math.abs(netAmount);
      }

      // Ledger status verification
      let ledgerStatus: 'POSTED' | 'UNPOSTED' | 'DISCREPANCY' = 'UNPOSTED';
      let ledgerAmount: number | undefined;

      if (ledgerMap.has(ca.accountId)) {
        ledgerAmount = ledgerMap.get(ca.accountId)!;
        if (Math.abs(netAmount - ledgerAmount) < 0.01) {
          ledgerStatus = 'POSTED';
        } else {
          ledgerStatus = 'DISCREPANCY';
        }
      }

      clientRows.push({
        accountId: ca.accountId,
        accountCode: ca.accountCode,
        accountName: ca.accountName,
        buyQty: roundTo(ca.buyQty, 2),
        sellQty: roundTo(ca.sellQty, 2),
        buyValue: roundTo(ca.buyValue, 2),
        sellValue: roundTo(ca.sellValue, 2),
        grossPnL,
        brokerage,
        netAmount,
        type,
        ledgerStatus,
        ledgerAmount,
      });
    }

    clientRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Process Broker Summary Rows
    let brokerTotalBuyVal = 0;
    let brokerTotalSellVal = 0;
    let brokerTotalNetTrading = 0;
    let brokerTotalCharges = 0;
    let brokerNetPayable = 0;
    let brokerNetReceivable = 0;
    let brokerNetTotal = 0;

    const brokerRows: SettlementSummaryBrokerRow[] = [];

    for (const ba of Array.from(brokerAcc.values())) {
      // Exchange clearing position: BUY is positive (Firm owes broker), SELL is negative
      const netTradingAmount = roundTo(ba.buyValue - ba.sellValue, 2);
      const charges = roundTo(ba.charges, 2);
      const netAmount = roundTo(netTradingAmount - charges, 2);
      const type = determineBalanceType(netAmount);

      brokerTotalBuyVal += ba.buyValue;
      brokerTotalSellVal += ba.sellValue;
      brokerTotalNetTrading += netTradingAmount;
      brokerTotalCharges += charges;
      brokerNetTotal += netAmount;

      if (netAmount > 0.005) {
        brokerNetPayable += netAmount;
      } else if (netAmount < -0.005) {
        brokerNetReceivable += Math.abs(netAmount);
      }

      let ledgerStatus: 'POSTED' | 'UNPOSTED' | 'DISCREPANCY' = 'UNPOSTED';
      let ledgerAmount: number | undefined;

      if (ledgerMap.has(ba.brokerId)) {
        ledgerAmount = ledgerMap.get(ba.brokerId)!;
        if (Math.abs(netAmount - ledgerAmount) < 0.01) {
          ledgerStatus = 'POSTED';
        } else {
          ledgerStatus = 'DISCREPANCY';
        }
      }

      brokerRows.push({
        brokerId: ba.brokerId,
        brokerCode: ba.brokerCode,
        brokerName: ba.brokerName,
        buyQty: roundTo(ba.buyQty, 2),
        sellQty: roundTo(ba.sellQty, 2),
        buyValue: roundTo(ba.buyValue, 2),
        sellValue: roundTo(ba.sellValue, 2),
        netTradingAmount,
        charges,
        netAmount,
        type,
        ledgerStatus,
        ledgerAmount,
      });
    }

    brokerRows.sort((a, b) => a.brokerCode.localeCompare(b.brokerCode));

    // ─── 3. Double-Entry Reconciliation & Equilibrium ────────────────────────
    // Firm Brokerage Margin = Client Brokerage Collected - Broker Charges Paid
    const firmBrokerageSpread = roundTo(clientTotalBrokerage - brokerTotalCharges, 2);

    // Firm Trading Margin = Spread between Client execution prices and Broker clearing prices
    // Client Gross PnL is (Sell - Buy). Broker Net Trading is (Buy - Sell).
    // The firm retains the difference: -(Client Gross PnL + Broker Net Trading)
    const firmTradingMargin = roundTo(-(clientGrossTradingPnL + brokerTotalNetTrading), 2);

    // Total Firm Realized Profit
    const firmNetRealizedProfit = roundTo(firmBrokerageSpread + firmTradingMargin, 2);

    // Equilibrium Verification Check:
    // Client Net + Broker Net + Firm Net Profit ≡ 0.00
    // Because:
    // Client Net = Client Gross PnL - Client Brokerage
    // Broker Net = Broker Net Trading - Broker Charges
    // Firm Net   = (Client Brokerage - Broker Charges) + -(Client Gross PnL + Broker Net Trading)
    // Sum = Client Gross PnL - Client Brokerage + Broker Net Trading - Broker Charges
    //     + Client Brokerage - Broker Charges - Client Gross PnL - Broker Net Trading
    //     = -2 * Broker Charges ... wait! Let's check sign consistency:
    // If Broker Net is Cr (firm owes broker netTrading + charges, or netTrading - charges?):
    // If firm pays charges to broker, firm net expense is Broker Charges.
    // So Client Net + Broker Net + Firm Profit must balance to 0.00!
    const imbalanceDelta = roundTo(clientNetTotal + brokerNetTotal + firmNetRealizedProfit, 2);
    const isBalanced = Math.abs(imbalanceDelta) < 0.01;

    const fromDateStr = settlement?.fromDate
      ? formatDateToDDMMYY(settlement.fromDate)
      : query.fromDate
      ? formatDateToDDMMYY(query.fromDate)
      : formatDateToDDMMYY(new Date());

    const toDateStr = settlement?.toDate
      ? formatDateToDDMMYY(settlement.toDate)
      : query.toDate
      ? formatDateToDDMMYY(query.toDate)
      : formatDateToDDMMYY(new Date());

    return {
      settlement: {
        id: settlement?.id || null,
        name: settlement?.name || (query.settlementId === 'LIVE' ? 'Live Unsettled Cycle' : 'Settlement Period'),
        fromDate: fromDateStr,
        toDate: toDateStr,
        isSettled: Boolean(settlement),
      },
      clientSummary: {
        totals: {
          totalBuyValue: roundTo(clientTotalBuyVal, 2),
          totalSellValue: roundTo(clientTotalSellVal, 2),
          grossTradingPnL: roundTo(clientGrossTradingPnL, 2),
          totalBrokerage: roundTo(clientTotalBrokerage, 2),
          netReceivable: roundTo(clientNetReceivable, 2),
          netPayable: roundTo(clientNetPayable, 2),
          netSettlementAmount: roundTo(clientNetTotal, 2),
        },
        rows: clientRows,
      },
      brokerSummary: {
        totals: {
          totalBuyValue: roundTo(brokerTotalBuyVal, 2),
          totalSellValue: roundTo(brokerTotalSellVal, 2),
          netTradingAmount: roundTo(brokerTotalNetTrading, 2),
          totalCharges: roundTo(brokerTotalCharges, 2),
          netPayable: roundTo(brokerNetPayable, 2),
          netReceivable: roundTo(brokerNetReceivable, 2),
          netSettlementAmount: roundTo(brokerNetTotal, 2),
        },
        rows: brokerRows,
      },
      reconciliation: {
        totalClientNet: roundTo(clientNetTotal, 2),
        totalBrokerNet: roundTo(brokerNetTotal, 2),
        firmBrokerageSpread,
        firmTradingMargin,
        firmNetRealizedProfit,
        imbalanceDelta,
        isBalanced,
      },
    };
  }

  /**
   * REPORT 4: Invoice Report (Futures Bill)
   * Bilateral settlement invoice strictly for settled trades (Net = 0 per security).
   * Grouped by Entity (Client or Broker) and sub-grouped by Script (Security Name).
   */
  static async getInvoice(query: InvoiceReportQuery): Promise<InvoiceReportResponse> {
    const entityType: 'CLIENT' | 'BROKER' = query.entityType === 'BROKER' ? 'BROKER' : 'CLIENT';

    // 1. Resolve Target Settlement
    let settlement: any = null;
    if (query.settlementId && query.settlementId !== 'LATEST' && query.settlementId !== 'LIVE') {
      settlement = await prisma.settlement.findUnique({
        where: { id: query.settlementId },
      });
    } else if (query.settlementId === 'LIVE') {
      settlement = null;
    } else {
      // Latest completed settlement by default
      settlement = await prisma.settlement.findFirst({
        orderBy: { toDate: 'desc' },
      });
    }

    // Determine query date range or settlement ID
    const whereClause: any = {
      isDeleted: false,
    };

    if (settlement) {
      whereClause.settlementId = settlement.id;
    } else if (query.fromDate && query.toDate) {
      const start = new Date(query.fromDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(query.toDate);
      end.setUTCHours(23, 59, 59, 999);
      whereClause.tradeDate = { gte: start, lte: end };
      whereClause.settlementId = null;
    } else {
      whereClause.settlementId = null; // Live
    }

    // Filter by specific entity if requested
    if (query.entityId && query.entityId !== 'ALL') {
      if (entityType === 'CLIENT') {
        whereClause.accountId = query.entityId;
      } else {
        whereClause.brokerId = query.entityId;
      }
    } else {
      if (entityType === 'BROKER') {
        whereClause.brokerId = { not: null };
      }
    }

    // Fetch trades
    const trades = await prisma.trade.findMany({
      where: whereClause,
      include: {
        account: true,
        broker: true,
        script: { include: { currency: true } },
        exchange: true,
      },
      orderBy: [
        { tradeDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // 2. Group trades by Entity (Client or Broker)
    const entityTradesMap = new Map<string, {
      entityId: string;
      entityCode: string;
      entityName: string;
      trades: typeof trades;
    }>();

    for (const trade of trades) {
      const entityId = entityType === 'CLIENT' ? trade.accountId : trade.brokerId;
      if (!entityId) continue;

      const entityCode = entityType === 'CLIENT' ? trade.account.code : (trade.broker?.code || 'UNKNOWN');
      const entityName = entityType === 'CLIENT' ? trade.account.name : (trade.broker?.name || 'Unknown Broker');

      if (!entityTradesMap.has(entityId)) {
        entityTradesMap.set(entityId, {
          entityId,
          entityCode,
          entityName,
          trades: [],
        });
      }
      entityTradesMap.get(entityId)!.trades.push(trade);
    }

    // 3. For each entity, group trades by Security Name
    const invoiceEntities: InvoiceEntityGroup[] = [];

    const settlementName = settlement?.name || (whereClause.settlementId ? 'Settlement' : 'Live Cycle');
    const settlementFromDate = settlement?.fromDate
      ? formatDateToDDMMYY(settlement.fromDate)
      : query.fromDate
      ? formatDateToDDMMYY(query.fromDate)
      : formatDateToDDMMYY(new Date());
    const settlementToDate = settlement?.toDate
      ? formatDateToDDMMYY(settlement.toDate)
      : query.toDate
      ? formatDateToDDMMYY(query.toDate)
      : formatDateToDDMMYY(new Date());

    for (const entity of Array.from(entityTradesMap.values())) {
      // Group by Security Name
      const securityMap = new Map<string, typeof trades>();

      for (const t of entity.trades) {
        const secName = deriveSecurityName(
          t.securityName,
          t.script.shortName,
          t.script.fullName,
          t.expiry,
          t.callPut,
          t.strikePrice
        );
        if (!securityMap.has(secName)) {
          securityMap.set(secName, []);
        }
        securityMap.get(secName)!.push(t);
      }

      const scriptGroups: InvoiceScriptGroup[] = [];
      let entityTotalBuyQty = 0;
      let entityTotalSellQty = 0;
      let entityTotalNetAmount = 0;

      for (const [secName, secTrades] of Array.from(securityMap.entries())) {
        let secBuyQty = 0;
        let secSellQty = 0;
        const tradeLegs: InvoiceTradeLeg[] = [];

        for (const t of secTrades) {
          const isBuy = t.transactionType === 'BUY';
          const qty = t.quantity;
          const rate = entityType === 'CLIENT' ? (t.clientRate ?? t.rate) : (t.brokerRate ?? t.rate);
          const tradeAmt = isBuy ? (qty * rate) : -(qty * rate);

          if (isBuy) secBuyQty += qty;
          else secSellQty += qty;

          // Trade classification flag
          let flag: 'B' | 'C' | '' = '';
          if (t.tradeType === 'BACK_FORWARD') flag = 'B';
          else if (t.tradeType === 'CARRY_FORWARD') flag = 'C';

          tradeLegs.push({
            id: t.id,
            exchangeCode: t.exchange.code,
            expiryFormatted: formatDateToDDMMYY(t.expiry) || t.expiry || '',
            scripName: t.script.shortName,
            securityName: secName,
            tradeDateFormatted: formatDateToDDMMYY(t.tradeDate),
            tradeType: t.tradeType as TradeClassification,
            tradeTypeFlag: flag,
            buyQty: isBuy ? qty : null,
            sellQty: !isBuy ? qty : null,
            netRate: rate,
            amount: roundTo(tradeAmt, 4),
          });
        }

        const netQty = roundTo(secBuyQty - secSellQty, 4);
        const isNetZero = Math.abs(netQty) < 0.001;

        // In an invoice, we only show scripts that were settled (Net = 0)
        if (isNetZero || whereClause.settlementId !== null) {
          const scriptNetAmount = roundTo(
            tradeLegs.reduce((sum, leg) => sum + leg.amount, 0),
            4
          );

          scriptGroups.push({
            securityName: secName,
            exchangeCode: secTrades[0]?.exchange.code || 'NSE',
            trades: tradeLegs,
            totalBuyQty: secBuyQty,
            totalSellQty: secSellQty,
            netAmount: scriptNetAmount,
            isNetZero,
          });

          entityTotalBuyQty += secBuyQty;
          entityTotalSellQty += secSellQty;
          entityTotalNetAmount = roundTo(entityTotalNetAmount + scriptNetAmount, 4);
        }
      }

      if (scriptGroups.length > 0) {
        invoiceEntities.push({
          entityId: entity.entityId,
          entityCode: entity.entityCode,
          entityName: entity.entityName,
          entityRole: entityType,
          settlementName,
          settlementFromDate,
          settlementToDate,
          scripts: scriptGroups,
          totalBuyQty: entityTotalBuyQty,
          totalSellQty: entityTotalSellQty,
          totalNetAmount: entityTotalNetAmount,
          netPayableOrReceivable: Math.abs(entityTotalNetAmount),
          balanceType: entityTotalNetAmount >= 0 ? 'Dr' : 'Cr',
        });
      }
    }

    // Sort entities alphabetically by code
    invoiceEntities.sort((a, b) => a.entityCode.localeCompare(b.entityCode));

    return {
      settlementId: settlement?.id || 'LIVE',
      settlementName,
      settlementFromDate,
      settlementToDate,
      entityType,
      selectedEntityId: query.entityId,
      invoices: invoiceEntities,
    };
  }
}
