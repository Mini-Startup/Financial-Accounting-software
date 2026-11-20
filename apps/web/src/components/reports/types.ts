export type GroupByDimension = 'CLIENT' | 'BROKER' | 'SCRIPT';

export type TradeClassification = 'REGULAR' | 'CARRY_FORWARD' | 'BACK_FORWARD' | 'SETTLEMENT';

export type BalanceType = 'Dr' | 'Cr' | 'Nil';

export type LedgerPostStatus = 'POSTED' | 'UNPOSTED' | 'DISCREPANCY';

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
  expiryFormatted: string;
  marketLot: number;
  buyQty: number;
  buyAvgRate: number;
  sellQty: number;
  sellAvgRate: number;
  netQty: number;
  totalUnits: number;
  netAvgRate: number;
  closingRate: number | null;
  marketValue: number;
  unrealizedPnL: number;
  isMissingRate: boolean;
  clientId?: string;
  clientCode?: string;
  clientName?: string;
  lotSize?: number;
  netLot?: number;
  mtmDiff?: number;
}

export interface NetPositionFinancialSummary {
  exposure: number;
  positiveExposure: number;
  negativeExposure: number;
  netQ: number;
  totalMtm: number;
  totalMargin: number;
  accountBalance: number;
  outstanding: number;
}

export interface NetPositionGroup {
  id: string;
  code: string;
  name: string;
  category: GroupByDimension;
  lotSize?: number;
  totals: {
    buyQty: number;
    sellQty: number;
    netQty: number;
    totalUnits: number;
    marketValue: number;
    unrealizedPnL: number;
    netLot?: number;
  };
  positions: NetPositionItem[];
  financialSummary?: NetPositionFinancialSummary;
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
  asOfDate: string;
  groupBy: GroupByDimension;
  summary: NetPositionSummary;
  groups: NetPositionGroup[];
}

export interface SettlementAuditTrade {
  id: string;
  tradeNumber: string;
  tradeDate: string;
  tradeType: TradeClassification;
  brokerCode: string | null;
  brokerName: string | null;
  securityName: string;
  transactionType: 'BUY' | 'SELL';
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

export interface SettlementDetailAuditResponse {
  settlementInfo: {
    id: string | null;
    name: string;
    fromDate: string;
    toDate: string;
  };
  metrics: {
    totalTrades: number;
    regularCount: number;
    cfCount: number;
    bfCount: number;
    settlementCount: number;
    totalTradedUnits: number;
    grossBuyValue: number;
    grossSellValue: number;
    totalCyclePnL: number;
  };
  clientAuditGroups: SettlementClientAuditGroup[];
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

export interface SettlementSummaryReportResponse {
  settlement: {
    id: string | null;
    name: string;
    fromDate: string;
    toDate: string;
    isSettled: boolean;
  };
  clientSummary: {
    totals: {
      totalBuyValue: number;
      totalSellValue: number;
      grossTradingPnL: number;
      totalBrokerage: number;
      netReceivable: number;
      netPayable: number;
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
