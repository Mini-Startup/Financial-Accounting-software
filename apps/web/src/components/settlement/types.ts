export interface SettlementItem {
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
  currencyCode?: string;
  currencySymbol?: string;
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
  finalPnL?: number;
}

export interface SettlementRecord {
  id: string;
  name: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  _count?: { trades: number };
}

export interface SettlementDetail {
  id: string;
  name: string;
  fromDate: string;
  toDate: string;
  trades: any[];
}

export interface SettlementPreviewData {
  isOpen: boolean;
  preview: any[];
  errors: any[];
  settlementFromDate: string;
  settlementToDate: string;
  unsettledTradesCount: number;
}
