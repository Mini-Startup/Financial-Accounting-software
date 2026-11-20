/**
 * TypeScript DTO and Domain Interfaces for Financial Reports
 * Covers: Net Position Report, Detailed Settlement Audit Report, Final Settlement Summary Report
 */

export type GroupByDimension = 'CLIENT' | 'BROKER' | 'SCRIPT';

export type TradeClassification = 'REGULAR' | 'CARRY_FORWARD' | 'BACK_FORWARD' | 'SETTLEMENT';

export type TransactionSide = 'BUY' | 'SELL';

export type BalanceType = 'Dr' | 'Cr' | 'Nil';

export type LedgerPostStatus = 'POSTED' | 'UNPOSTED' | 'DISCREPANCY';

// ─── REPORT 1: NET POSITION REPORT ──────────────────────────────────────────

export interface NetPositionReportQuery {
  groupBy?: GroupByDimension;
  accountId?: string;
  brokerId?: string;
  scriptId?: string;
  asOfDate?: string; // YYYY-MM-DD or DD-MM-YY
}

export interface NetPositionItem {
  securityName: string;
  scriptId: string;
  scriptShortName: string;
  scriptFullName: string;
  exchangeId: string;
  exchangeCode: string;
  currencyCode: string;
  currencySymbol: string;
  expiry: string | null;
  expiryFormatted: string; // Strictly "DD-MM-YY"
  marketLot: number;
  buyQty: number;
  buyAvgRate: number;
  sellQty: number;
  sellAvgRate: number;
  netQty: number;
  totalUnits: number; // abs(netQty) * marketLot
  netAvgRate: number;
  closingRate: number | null;
  marketValue: number; // totalUnits * (closingRate || 0)
  unrealizedPnL: number;
  isMissingRate: boolean;
}

export interface NetPositionGroup {
  id: string;
  code: string;
  name: string;
  category: GroupByDimension;
  totals: {
    buyQty: number;
    sellQty: number;
    netQty: number;
    totalUnits: number;
    marketValue: number;
    unrealizedPnL: number;
  };
  positions: NetPositionItem[];
}

export interface NetPositionSummary {
  totalOpenTrades: number;
  totalOpenContracts: number;
  totalLongContracts: number;
  totalShortContracts: number;
  totalNotionalMarketValue: number;
  totalUnrealizedPnL: number;
  missingClosingRatesCount: number;
}

export interface NetPositionReportResponse {
  asOfDate: string; // Strictly "DD-MM-YY"
  groupBy: GroupByDimension;
  summary: NetPositionSummary;
  groups: NetPositionGroup[];
}

// ─── REPORT 2: DETAILED SETTLEMENT AUDIT REPORT ─────────────────────────────

export interface SettlementDetailAuditQuery {
  settlementId?: string;
  fromDate?: string;
  toDate?: string;
  tradeType?: 'ALL' | TradeClassification;
  clientId?: string;
  brokerId?: string;
}

export interface SettlementAuditTrade {
  id: string;
  tradeNumber: string;
  tradeDate: string; // Strictly "DD-MM-YY"
  tradeType: TradeClassification;
  brokerCode: string | null;
  brokerName: string | null;
  securityName: string;
  transactionType: TransactionSide;
  quantity: number;
  marketLot: number;
  totalUnits: number;
  rate: number;
  settlementRate: number | null;
  tradeValue: number;
  pnl: number;
  remarks: string | null;
}

export interface SettlementClientAuditGroup {
  clientId: string;
  clientCode: string;
  clientName: string;
  subtotals: {
    buyQty: number;
    sellQty: number;
    netQty: number;
    buyValue: number;
    sellValue: number;
    cyclePnL: number;
  };
  trades: SettlementAuditTrade[];
}

export interface SettlementDetailMetrics {
  totalTrades: number;
  regularCount: number;
  cfCount: number;
  bfCount: number;
  settlementCount: number;
  totalTradedUnits: number;
  grossBuyValue: number;
  grossSellValue: number;
  totalCyclePnL: number;
}

export interface SettlementDetailAuditResponse {
  settlementInfo: {
    id: string | null;
    name: string;
    fromDate: string; // Strictly "DD-MM-YY"
    toDate: string;   // Strictly "DD-MM-YY"
  };
  metrics: SettlementDetailMetrics;
  clientAuditGroups: SettlementClientAuditGroup[];
}

// ─── REPORT 3: FINAL SETTLEMENT SUMMARY REPORT (SETTLEMENT SHEET) ───────────

export interface SettlementSummaryReportQuery {
  settlementId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface SettlementSummaryClientRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  buyQty: number;
  sellQty: number;
  buyValue: number;
  sellValue: number;
  grossPnL: number;
  brokerage: number;
  netAmount: number;
  type: BalanceType;
  ledgerStatus: LedgerPostStatus;
  ledgerAmount?: number;
}

export interface SettlementSummaryBrokerRow {
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  buyQty: number;
  sellQty: number;
  buyValue: number;
  sellValue: number;
  netTradingAmount: number;
  charges: number;
  netAmount: number;
  type: BalanceType;
  ledgerStatus: LedgerPostStatus;
  ledgerAmount?: number;
}

export interface SettlementSummaryReconciliation {
  totalClientNet: number;
  totalBrokerNet: number;
  firmBrokerageSpread: number;
  firmTradingMargin: number;
  firmNetRealizedProfit: number;
  imbalanceDelta: number;
  isBalanced: boolean;
}

// ─── REPORT 4: INVOICE REPORT (FUTURES BILL) ──────────────────────────────

export interface InvoiceReportQuery {
  entityType?: 'CLIENT' | 'BROKER';
  entityId?: string; // specific client/broker ID or undefined for ALL
  settlementId?: string; // settlement ID or 'LATEST'
  fromDate?: string;
  toDate?: string;
}

export interface InvoiceTradeLeg {
  id: string;
  exchangeCode: string;
  expiryFormatted: string;
  scripName: string;
  securityName: string;
  tradeDateFormatted: string;
  tradeType: TradeClassification;
  tradeTypeFlag: 'B' | 'C' | '';
  buyQty: number | null;
  sellQty: number | null;
  netRate: number;
  amount: number;
}

export interface InvoiceScriptGroup {
  securityName: string;
  exchangeCode: string;
  trades: InvoiceTradeLeg[];
  totalBuyQty: number;
  totalSellQty: number;
  netAmount: number;
  isNetZero: boolean;
}

export interface InvoiceEntityGroup {
  entityId: string;
  entityCode: string;
  entityName: string;
  entityRole: 'CLIENT' | 'BROKER';
  settlementName: string;
  settlementFromDate: string;
  settlementToDate: string;
  scripts: InvoiceScriptGroup[];
  totalBuyQty: number;
  totalSellQty: number;
  totalNetAmount: number;
  netPayableOrReceivable: number;
  balanceType: BalanceType;
}

export interface InvoiceReportResponse {
  settlementId: string;
  settlementName: string;
  settlementFromDate: string;
  settlementToDate: string;
  entityType: 'CLIENT' | 'BROKER';
  selectedEntityId?: string;
  invoices: InvoiceEntityGroup[];
}

export interface SettlementSummaryReportResponse {
  settlement: {
    id: string | null;
    name: string;
    fromDate: string; // Strictly "DD-MM-YY"
    toDate: string;   // Strictly "DD-MM-YY"
    isSettled: boolean;
  };
  clientSummary: {
    totals: {
      totalBuyValue: number;
      totalSellValue: number;
      grossTradingPnL: number;
      totalBrokerage: number;
      netReceivable: number; // Dr total
      netPayable: number;    // Cr total
      netSettlementAmount: number;
    };
    rows: SettlementSummaryClientRow[];
  };
  brokerSummary: {
    totals: {
      totalBuyValue: number;
      totalSellValue: number;
      netTradingAmount: number;
      totalCharges: number;
      netPayable: number;
      netReceivable: number;
      netSettlementAmount: number;
    };
    rows: SettlementSummaryBrokerRow[];
  };
  reconciliation: SettlementSummaryReconciliation;
}
