// ─── Constants ─────────────────────────────────────

export const ROUND_DECIMALS = 4;

/**
 * Round a number to ROUND_DECIMALS decimal places.
 * Uses the multiply-round-divide pattern to avoid floating point drift.
 * Example: round(0.10000000000000001) => 0.1
 */
export function round(value: number): number {
  const factor = Math.pow(10, ROUND_DECIMALS);
  return Math.round(value * factor) / factor;
}

// ─── Types ─────────────────────────────────────────

export interface BrokerageRule {
  type: 'AMOUNT' | 'PERCENT';
  baseAmount?: number | null;
  flatFee?: number | null;
  tradingBuyPct?: number | null;
  tradingSellPct?: number | null;
  tradingMinFee?: number | null;
  deliveryBuyPct?: number | null;
  deliverySellPct?: number | null;
  deliveryMinFee?: number | null;
}

export interface CalcInput {
  quantity: number;       // positive = BUY, negative = SELL
  marketRate: number;
  segment: 'TRADING' | 'DELIVERY';
  clientRule: BrokerageRule;
  brokerRule: BrokerageRule;
}

export interface CalcResult {
  side: 'BUY' | 'SELL';
  absQuantity: number;
  tradeValue: number;

  // Client side
  clientBrokerage: number;   // total brokerage charged to client (0 if AMOUNT type)
  clientPerUnit: number;     // per-unit brokerage for client
  clientRate: number;        // effective rate for client
  clientIsFixed: boolean;    // true when client rule is AMOUNT (brokerage at invoice)
  clientRuleType: 'AMOUNT' | 'PERCENT';

  // Broker side
  brokerBrokerage: number;   // total brokerage from broker (0 if AMOUNT type)
  brokerPerUnit: number;     // per-unit brokerage for broker
  brokerRate: number;        // effective rate for broker
  brokerIsFixed: boolean;    // true when broker rule is AMOUNT (brokerage at invoice)
  brokerRuleType: 'AMOUNT' | 'PERCENT';

  profit: number;            // spread earned (per unit)
  totalProfit: number;       // spread earned (total for all units)
}

// ─── Core Calculation ──────────────────────────────

/**
 * Calculate brokerage for ONE side (client OR broker).
 *
 * ONLY called for PERCENT type rules.
 *
 * PERCENT type:
 *   Pick the correct pct based on segment (TRADING/DELIVERY) + side (BUY/SELL).
 *   brokerage = tradeValue * (pct / 100)
 *   If result < minFee → use minFee instead.
 *   Edge: null pct fields → treated as 0%.
 */
export function calculateBrokerage(
  rule: BrokerageRule,
  tradeValue: number,
  side: 'BUY' | 'SELL',
  segment: 'TRADING' | 'DELIVERY',
): number {
  // PERCENT type
  let pct: number;
  let minFee: number;

  if (segment === 'TRADING') {
    pct = (side === 'BUY' ? rule.tradingBuyPct : rule.tradingSellPct) ?? 0;
    minFee = rule.tradingMinFee ?? 0;
  } else {
    pct = (side === 'BUY' ? rule.deliveryBuyPct : rule.deliverySellPct) ?? 0;
    minFee = rule.deliveryMinFee ?? 0;
  }

  const brokerage = round(tradeValue * (pct / 100));
  return brokerage < minFee ? minFee : brokerage;
}

/**
 * Full trade calculation with both sides.
 *
 * CRITICAL LOGIC:
 *   quantity >= 0 → BUY    |    quantity < 0 → SELL
 *
 *   tradeValue = |quantity| * marketRate
 *
 * FOR EACH SIDE (client / broker):
 *   If rule.type === 'AMOUNT':
 *     → Skip brokerage calculation entirely.
 *     → The rate stays exactly equal to marketRate.
 *     → Mark as "fixed" — this brokerage is settled at invoice time.
 *
 *   If rule.type === 'PERCENT':
 *     → Calculate brokerage using buy/sell percentage + minFee.
 *     → perUnitBrokerage = totalBrokerage / |quantity|
 *     → BUY:  rate = marketRate + perUnit  (client/broker pays more)
 *     → SELL: rate = marketRate - perUnit  (client/broker receives less)
 *
 * PROFIT (middleman spread):
 *   BUY:  profit per unit = clientRate - brokerRate
 *   SELL: profit per unit = brokerRate - clientRate
 *   totalProfit = profit per unit * |quantity|
 *
 *   Profit > 0 means the system earns on this trade.
 *   Profit < 0 means the system loses (warning, but allowed).
 *
 * EDGE CASES:
 *   quantity = 0 → side=BUY, everything = 0
 *   marketRate = 0 → tradeValue=0, pct brokerage=0, may still hit minFee
 */
export function calculateTrade(input: CalcInput): CalcResult {
  const side: 'BUY' | 'SELL' = input.quantity >= 0 ? 'BUY' : 'SELL';
  const absQuantity = Math.abs(input.quantity);
  const tradeValue = round(absQuantity * input.marketRate);

  // ── Client side ──────────────────────────────────
  const clientIsFixed = input.clientRule.type === 'AMOUNT';
  let clientBrokerage = 0;
  let clientPerUnit = 0;
  let clientRate = input.marketRate;

  if (!clientIsFixed) {
    clientBrokerage = calculateBrokerage(
      input.clientRule, tradeValue, side, input.segment,
    );
    clientPerUnit = absQuantity > 0 ? round(clientBrokerage / absQuantity) : 0;

    if (side === 'BUY') {
      clientRate = round(input.marketRate + clientPerUnit);
    } else {
      clientRate = round(input.marketRate - clientPerUnit);
    }
  }

  // ── Broker side ──────────────────────────────────
  const brokerIsFixed = input.brokerRule.type === 'AMOUNT';
  let brokerBrokerage = 0;
  let brokerPerUnit = 0;
  let brokerRate = input.marketRate;

  if (!brokerIsFixed) {
    brokerBrokerage = calculateBrokerage(
      input.brokerRule, tradeValue, side, input.segment,
    );
    brokerPerUnit = absQuantity > 0 ? round(brokerBrokerage / absQuantity) : 0;

    if (side === 'BUY') {
      brokerRate = round(input.marketRate + brokerPerUnit);
    } else {
      brokerRate = round(input.marketRate - brokerPerUnit);
    }
  }

  // ── Profit ───────────────────────────────────────
  const profit = side === 'BUY'
    ? round(clientRate - brokerRate)
    : round(brokerRate - clientRate);

  const totalProfit = round(profit * absQuantity);

  return {
    side,
    absQuantity,
    tradeValue,
    clientBrokerage,
    clientPerUnit,
    clientRate,
    clientIsFixed,
    clientRuleType: input.clientRule.type,
    brokerBrokerage,
    brokerPerUnit,
    brokerRate,
    brokerIsFixed,
    brokerRuleType: input.brokerRule.type,
    profit,
    totalProfit,
  };
}
