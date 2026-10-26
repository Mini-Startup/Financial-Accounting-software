// ─── Constants ─────────────────────────────────────

export const ROUND_DECIMALS = 4;

/**
 * Round a number to ROUND_DECIMALS decimal places.
 * Uses the multiply-round-divide pattern to avoid floating point drift.
 * Example: round(0.10000000000000001) => 0.1
 */
export function round(value: number, decimals: number = ROUND_DECIMALS): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ─── Types ─────────────────────────────────────────

export type DirectionType = 'BOTH' | 'BUY' | 'SELL';

export interface ClientBrokerageRule {
  quantity: number;          // Base quantity in rule (e.g. 50, or market lot)
  brokerage: number;         // Brokerage amount for that quantity (e.g. 10)
  direction?: DirectionType; // BOTH, BUY, SELL
}

export interface TradeRateInput {
  rate: number;              // Market rate (price per unit)
  quantity: number;          // Trade quantity (number of lots/units)
  marketLot?: number | null; // Multiplier per lot (default: 1)
  side: 'BUY' | 'SELL';
  clientRule?: ClientBrokerageRule | null;
  brokerBrokerage?: number | null; // Sum of 4 import fields (commission + exCharge + charge1 + charge2)
  tradeType?: string | null; // e.g. CARRY_FORWARD, BACK_FORWARD, SETTLEMENT
}

export interface TradeRateResult {
  side: 'BUY' | 'SELL';
  quantity: number;
  marketLot: number;
  totalUnits: number;
  marketValue: number;

  // Client side
  clientBrokerage: number;   // Total brokerage charged to client
  clientPerUnit: number;     // Per unit brokerage
  clientRate: number;        // Effective price per unit
  clientMarketValue: number; // Total net amount for client

  // Broker side
  brokerBrokerage: number;   // Total brokerage paid to broker
  brokerPerUnit: number;     // Per unit brokerage
  brokerRate: number;        // Effective price per unit
  brokerMarketValue: number; // Total net amount for broker

  // Profit
  profitPerUnit: number;
  profitTotal: number;
}

/**
 * Sum broker charges from import file fields.
 */
export function calculateBrokerBrokerage(
  commission?: number | null,
  exCharge?: number | null,
  charge1?: number | null,
  charge2?: number | null,
): number {
  return round((commission || 0) + (exCharge || 0) + (charge1 || 0) + (charge2 || 0));
}

/**
 * Calculate client brokerage amount based on trade quantity (NOT market lot).
 * clientBrokerage = (tradeQuantity / ruleQuantity) * ruleBrokerage
 */
export function calculateClientBrokerage(
  tradeQuantity: number,
  ruleQuantity: number,
  ruleBrokerage: number,
): number {
  if (ruleQuantity <= 0 || tradeQuantity <= 0) return 0;
  return round((tradeQuantity / ruleQuantity) * ruleBrokerage);
}

/**
 * Calculate all rates and total market values for a trade.
 * Market Value = rate * quantity * marketLot
 * Client Rate = Price ± Client Brokerage Per Unit
 * Broker Rate = Price ± Broker Brokerage Per Unit
 * Client Market Value = Client Rate * quantity * marketLot
 * Broker Market Value = Broker Rate * quantity * marketLot
 */
export function calculateTradeRates(input: TradeRateInput): TradeRateResult {
  const side = input.side;
  const absQty = Math.abs(input.quantity);
  const lot = input.marketLot && input.marketLot > 0 ? input.marketLot : 1;
  const totalUnits = round(absQty * lot);
  const marketValue = round(input.rate * totalUnits);

  // Zero-brokerage trade types: Carry Forward, Back Forward, Settlement
  const isZeroBrokerage = ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(
    (input.tradeType || '').toUpperCase()
  );
  if (isZeroBrokerage) {
    return {
      side,
      quantity: absQty,
      marketLot: lot,
      totalUnits,
      marketValue,
      clientBrokerage: 0,
      clientPerUnit: 0,
      clientRate: input.rate,
      clientMarketValue: marketValue,
      brokerBrokerage: 0,
      brokerPerUnit: 0,
      brokerRate: input.rate,
      brokerMarketValue: marketValue,
      profitPerUnit: 0,
      profitTotal: 0,
    };
  }

  // Client calculation:
  // Rule specifies: rule.brokerage per rule.quantity (lots).
  // Each lot has `lot` units (marketLot).
  // Therefore, per-share rate adjustment = (rule.brokerage / rule.quantity) / lot.
  let clientBrokerage = 0;
  let clientPerUnit = 0; // per-share rate adjustment
  if (input.clientRule && input.clientRule.quantity > 0) {
    const dir = input.clientRule.direction || 'BOTH';
    if (dir === 'BOTH' || dir === side) {
      const perLotBrokerage = input.clientRule.brokerage / input.clientRule.quantity;
      clientPerUnit = round(perLotBrokerage / lot);
      clientBrokerage = round(perLotBrokerage * absQty);
    }
  }

  // Broker calculation:
  // Charges from file are already a per-unit price adjustment — directly added/subtracted without dividing by qty or lot.
  const brokerPerUnit = round(input.brokerBrokerage || 0);
  const brokerBrokerage = round(brokerPerUnit * totalUnits);

  // Client Rate & Market Value: Price ± Client Brokerage Per Unit
  let clientRate = input.rate;
  if (side === 'BUY') {
    clientRate = round(input.rate + clientPerUnit);
  } else {
    clientRate = round(input.rate - clientPerUnit);
  }
  const clientMarketValue = round(clientRate * totalUnits);

  // Broker Rate & Market Value: Price ± Broker Brokerage Per Unit
  let brokerRate = input.rate;
  if (side === 'BUY') {
    brokerRate = round(input.rate + brokerPerUnit);
  } else {
    brokerRate = round(input.rate - brokerPerUnit);
  }
  const brokerMarketValue = round(brokerRate * totalUnits);

  // Profit: net profit per share
  const profitPerUnit = side === 'BUY'
    ? round(clientRate - brokerRate)
    : round(brokerRate - clientRate);
  const profitTotal = round(profitPerUnit * totalUnits);

  return {
    side,
    quantity: absQty,
    marketLot: lot,
    totalUnits,
    marketValue,
    clientBrokerage,
    clientPerUnit,
    clientRate,
    clientMarketValue,
    brokerBrokerage,
    brokerPerUnit,
    brokerRate,
    brokerMarketValue,
    profitPerUnit,
    profitTotal,
  };
}

export interface StoredBrokerageRule {
  id?: string;
  accountId: string;
  appliesTo?: 'SINGLE_SCRIPT' | 'ALL_SCRIPTS' | string;
  scriptId?: string | null;
  quantity: number;
  brokerage: number;
  direction?: DirectionType | string;
}

/**
 * Resolve client brokerage rule from in-memory list for a given account, script and direction.
 */
export function resolveClientRule(
  rules: StoredBrokerageRule[] | undefined | null,
  accountId?: string | null,
  scriptId?: string | null,
  side?: 'BUY' | 'SELL'
): StoredBrokerageRule | null {
  if (!accountId || !rules || rules.length === 0) return null;
  const forAcc = rules.filter(
    (b) => b.accountId === accountId && (b.appliesTo === 'CLIENT' || b.appliesTo === 'SINGLE_SCRIPT' || b.appliesTo === 'ALL_SCRIPTS' || !b.appliesTo)
  );
  if (forAcc.length === 0) return null;

  const targetSide = side || 'BUY';

  // 1. Script specific + direction match
  if (scriptId) {
    const sExact = forAcc.find((r) => r.scriptId === scriptId && r.direction === targetSide);
    if (sExact) return sExact;
    const sBoth = forAcc.find((r) => r.scriptId === scriptId && (r.direction === 'BOTH' || !r.direction));
    if (sBoth) return sBoth;
  }

  // 2. Default script (null scriptId or appliesTo === 'ALL_SCRIPTS') + direction match
  const dExact = forAcc.find((r) => (!r.scriptId || r.appliesTo === 'ALL_SCRIPTS') && r.direction === targetSide);
  if (dExact) return dExact;

  const dBoth = forAcc.find((r) => (!r.scriptId || r.appliesTo === 'ALL_SCRIPTS') && (r.direction === 'BOTH' || !r.direction));
  return dBoth || null;
}
