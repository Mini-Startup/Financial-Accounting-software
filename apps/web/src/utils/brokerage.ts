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
 * Client Rate = Market Value ± Client Brokerage
 * Broker Rate = Market Value ± Broker Brokerage
 */
export function calculateTradeRates(input: TradeRateInput): TradeRateResult {
  const side = input.side;
  const absQty = Math.abs(input.quantity);
  const lot = input.marketLot && input.marketLot > 0 ? input.marketLot : 1;
  const totalUnits = round(absQty * lot);
  const marketValue = round(input.rate * totalUnits);

  // Client calculation: based purely on tradeQuantity (not market lot!)
  let clientBrokerage = 0;
  if (input.clientRule && input.clientRule.quantity > 0) {
    const dir = input.clientRule.direction || 'BOTH';
    if (dir === 'BOTH' || dir === side) {
      clientBrokerage = calculateClientBrokerage(
        absQty,
        input.clientRule.quantity,
        input.clientRule.brokerage,
      );
    }
  }

  // Broker calculation: sum of file charges or rule
  const brokerBrokerage = round(input.brokerBrokerage || 0);

  // Client Rate & Market Value: Market Value ± Client Brokerage
  let clientRate = marketValue;
  if (side === 'BUY') {
    clientRate = round(marketValue + clientBrokerage);
  } else {
    clientRate = round(marketValue - clientBrokerage);
  }
  const clientMarketValue = clientRate;

  // Broker Rate & Market Value: Market Value ± Broker Brokerage
  let brokerRate = marketValue;
  if (side === 'BUY') {
    brokerRate = round(marketValue + brokerBrokerage);
  } else {
    brokerRate = round(marketValue - brokerBrokerage);
  }
  const brokerMarketValue = brokerRate;

  // Profit: middleman spread
  const profitTotal = side === 'BUY'
    ? round(clientMarketValue - brokerMarketValue)
    : round(brokerMarketValue - clientMarketValue);
  const profitPerUnit = totalUnits > 0 ? round(profitTotal / totalUnits) : 0;
  const clientPerUnit = absQty > 0 ? round(clientBrokerage / absQty) : 0;
  const brokerPerUnit = absQty > 0 ? round(brokerBrokerage / absQty) : 0;

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
