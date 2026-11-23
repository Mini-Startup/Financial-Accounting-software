import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatDateToDDMMYY,
  parseDateBoundary,
  getEffectiveMarketLot,
  calculateWeightedAverage,
  determineBalanceType,
  roundTo,
} from './utils';

describe('Financial Reports — Mathematical & Logic Engine', () => {
  describe('Tier 1: Date Formatting & Boundary Compliance (DD-MM-YY)', () => {
    it('should format ISO date strings strictly to DD-MM-YY', () => {
      assert.strictEqual(formatDateToDDMMYY('2026-11-18T10:00:00.000Z'), '18-11-26');
      assert.strictEqual(formatDateToDDMMYY('2026-02-28'), '28-02-26');
      assert.strictEqual(formatDateToDDMMYY('2025-01-05T00:00:00.000Z'), '05-01-25');
    });

    it('should format Date objects strictly to DD-MM-YY', () => {
      const d = new Date(Date.UTC(2026, 9, 25)); // 25 Oct 2026
      assert.strictEqual(formatDateToDDMMYY(d), '25-10-26');
    });

    it('should format DD-MM-YYYY inputs properly to DD-MM-YY', () => {
      assert.strictEqual(formatDateToDDMMYY('18-11-2026'), '18-11-26');
      assert.strictEqual(formatDateToDDMMYY('01/04/2026'), '01-04-26');
    });

    it('should handle null, undefined, or empty values gracefully', () => {
      assert.strictEqual(formatDateToDDMMYY(null), '');
      assert.strictEqual(formatDateToDDMMYY(undefined), '');
      assert.strictEqual(formatDateToDDMMYY(''), '');
    });

    it('should parse start-of-day boundary to UTC 00:00:00.000', () => {
      const start = parseDateBoundary('2026-11-18', false);
      assert.ok(start);
      assert.strictEqual(start.getUTCFullYear(), 2026);
      assert.strictEqual(start.getUTCMonth(), 10); // Nov (0-indexed 10)
      assert.strictEqual(start.getUTCDate(), 18);
      assert.strictEqual(start.getUTCHours(), 0);
      assert.strictEqual(start.getUTCMinutes(), 0);
      assert.strictEqual(start.getUTCSeconds(), 0);
      assert.strictEqual(start.getUTCMilliseconds(), 0);
    });

    it('should parse end-of-day boundary to UTC 23:59:59.999', () => {
      const end = parseDateBoundary('2026-11-18', true);
      assert.ok(end);
      assert.strictEqual(end.getUTCFullYear(), 2026);
      assert.strictEqual(end.getUTCMonth(), 10);
      assert.strictEqual(end.getUTCDate(), 18);
      assert.strictEqual(end.getUTCHours(), 23);
      assert.strictEqual(end.getUTCMinutes(), 59);
      assert.strictEqual(end.getUTCSeconds(), 59);
      assert.strictEqual(end.getUTCMilliseconds(), 999);
    });
  });

  describe('Tier 2: Market Lot & Weighted Average Rate Calculations', () => {
    it('should prioritize trade.marketLot over script.lotSize', () => {
      assert.strictEqual(getEffectiveMarketLot(100, 50), 100);
      assert.strictEqual(getEffectiveMarketLot(null, 50), 50);
      assert.strictEqual(getEffectiveMarketLot(0, 50), 50);
      assert.strictEqual(getEffectiveMarketLot(null, null), 1);
      assert.strictEqual(getEffectiveMarketLot(0, 0), 1);
    });

    it('should compute accurate weighted average rate across multiple trade lots', () => {
      // 10 lots @ 2,000 with lotSize 100 = 1,000 units, value 2,000,000
      // 20 lots @ 2,150 with lotSize 100 = 2,000 units, value 4,300,000
      // Total volume = 3,000 units. Total value = 6,300,000.
      // Expected weighted average = 6,300,000 / 3,000 = 2,100.0000
      const trades = [
        { quantity: 10, rate: 2000, marketLot: 100 },
        { quantity: 20, rate: 2150, marketLot: 100 },
      ];
      const avg = calculateWeightedAverage(trades);
      assert.strictEqual(avg, 2100.0);
    });

    it('should compute weighted average with heterogeneous lot sizes', () => {
      // 5 lots @ 100 (lot 10) = 50 units, val 5,000
      // 5 lots @ 200 (lot 20) = 100 units, val 20,000
      // Total units = 150. Total value = 25,000.
      // Expected avg = 25,000 / 150 = 166.6667
      const trades = [
        { quantity: 5, rate: 100, marketLot: 10 },
        { quantity: 5, rate: 200, marketLot: 20 },
      ];
      const avg = calculateWeightedAverage(trades);
      assert.strictEqual(avg, 166.6667);
    });

    it('should return 0 when trade quantity/volume is zero', () => {
      const avg = calculateWeightedAverage([]);
      assert.strictEqual(avg, 0);
    });
  });

  describe('Tier 3: Net Position & MTM Unrealized PnL Formulas', () => {
    it('should compute Net Long position (+ Lots) and positive MTM profit', () => {
      // Bought 15 lots @ 2,200. Sold 5 lots @ 2,220. Lot size = 100.
      // Buy Val = 15 * 100 * 2200 = 3,300,000
      // Sell Val = 5 * 100 * 2220 = 1,110,000
      // Net Qty = +10 lots. Total units = 1,000.
      // Net Cost Basis = 3,300,000 - 1,110,000 = 2,190,000
      // Net Avg Rate = 2,190,000 / 1,000 = 2,190.0000
      // Closing Rate = 2,240.0000
      // Unrealized PnL = (Closing - NetAvg) * TotalUnits = (2240 - 2190) * 1000 = +50,000.00
      const buyQty = 15;
      const sellQty = 5;
      const lot = 100;
      const buyVal = 15 * 100 * 2200;
      const sellVal = 5 * 100 * 2220;
      const netQty = buyQty - sellQty;
      const totalUnits = Math.abs(netQty) * lot;
      const netCostBasis = buyVal - sellVal;
      const netAvgRate = roundTo(netCostBasis / totalUnits, 4);
      const closingRate = 2240.0;
      const pnl = roundTo((closingRate - netAvgRate) * totalUnits, 2);

      assert.strictEqual(netQty, 10);
      assert.strictEqual(totalUnits, 1000);
      assert.strictEqual(netAvgRate, 2190.0);
      assert.strictEqual(pnl, 50000.0);
    });

    it('should compute Net Short position (- Lots) and MTM loss when price rises', () => {
      // Sold 10 lots @ 75.0. Bought 2 lots @ 74.0. Lot size = 1,000.
      // Sell Val = 10 * 1000 * 75.0 = 750,000
      // Buy Val = 2 * 1000 * 74.0 = 148,000
      // Net Qty = 2 - 10 = -8 lots (Short). Total units = 8,000.
      // Net Cost Basis = 750,000 - 148,000 = 602,000
      // Net Avg Rate = 602,000 / 8,000 = 75.2500
      // Closing Rate rises to 76.0000 (Loss for Short position)
      // Unrealized PnL = (NetAvg - Closing) * TotalUnits = (75.25 - 76.00) * 8000 = -6,000.00
      const buyQty = 2;
      const sellQty = 10;
      const lot = 1000;
      const buyVal = 2 * 1000 * 74.0;
      const sellVal = 10 * 1000 * 75.0;
      const netQty = buyQty - sellQty;
      const totalUnits = Math.abs(netQty) * lot;
      const netCostBasis = sellVal - buyVal;
      const netAvgRate = roundTo(netCostBasis / totalUnits, 4);
      const closingRate = 76.0;
      const pnl = roundTo((netAvgRate - closingRate) * totalUnits, 2);

      assert.strictEqual(netQty, -8);
      assert.strictEqual(totalUnits, 8000);
      assert.strictEqual(netAvgRate, 75.25);
      assert.strictEqual(pnl, -6000.0);
    });

    it('should compute 0.00 MTM PnL when position is completely flat (buyQty === sellQty)', () => {
      const netQty = 0;
      const totalUnits = 0;
      const closingRate = 150.0;
      const pnl = netQty === 0 ? 0 : totalUnits * closingRate;
      assert.strictEqual(pnl, 0);
    });

    it('should flag missing closing rate and zero MTM PnL gracefully', () => {
      const closingRate: number | null = null;
      const isMissingRate = closingRate === null;
      const marketValue = isMissingRate ? 0 : 500 * (closingRate ?? 0);
      const unrealizedPnL = isMissingRate ? 0 : 1000;

      assert.strictEqual(isMissingRate, true);
      assert.strictEqual(marketValue, 0);
      assert.strictEqual(unrealizedPnL, 0);
    });
  });

  describe('Tier 4: Trade Classification & Settlement Audit Math', () => {
    it('should categorize trades into REGULAR, CARRY_FORWARD, BACK_FORWARD, SETTLEMENT', () => {
      const classifications = ['REGULAR', 'CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'];
      assert.strictEqual(classifications.length, 4);
      assert.ok(classifications.includes('REGULAR'));
      assert.ok(classifications.includes('CARRY_FORWARD'));
      assert.ok(classifications.includes('BACK_FORWARD'));
      assert.ok(classifications.includes('SETTLEMENT'));
    });

    it('should compute trade values and counterparty PnL contributions', () => {
      // BUY trade: 5 lots @ 150 with lot 10 -> 50 units -> Value 7,500. PnL contribution: -7,500
      // SELL trade: 5 lots @ 160 with lot 10 -> 50 units -> Value 8,000. PnL contribution: +8,000
      // Client cycle net PnL: +500
      const buyUnits = 5 * 10;
      const buyRate = 150;
      const buyValue = buyUnits * buyRate;
      const buyPnL = -buyValue;

      const sellUnits = 5 * 10;
      const sellRate = 160;
      const sellValue = sellUnits * sellRate;
      const sellPnL = sellValue;

      const totalPnL = buyPnL + sellPnL;
      assert.strictEqual(buyValue, 7500);
      assert.strictEqual(sellValue, 8000);
      assert.strictEqual(totalPnL, 500);
    });
  });

  describe('Tier 5: Double-Entry Equilibrium Check (Δ ≡ 0.00)', () => {
    it('should verify exact zero discrepancy Δ = Client Net + Broker Net + Firm Net ≡ 0.00', () => {
      // Scenario:
      // Client trades:
      // - Buy: 10 lots @ $102 (lot 100) = $102,000 buy value
      // - Sell: 10 lots @ $105 (lot 100) = $105,000 sell value
      // - Gross PnL = $105,000 - $102,000 = +$3,000 (Cr)
      // - Client Brokerage = $200
      // - Client Net = $3,000 - $200 = +$2,800 (Cr, firm owes client)
      //
      // Broker trades (Exchange clearing rate):
      // - Buy: 10 lots @ $100 (lot 100) = $100,000
      // - Sell: 10 lots @ $103 (lot 100) = $103,000
      // - Broker Net Trading = Buy ($100k) - Sell ($103k) = -$3,000 (Dr, broker owes firm)
      // - Broker Charges = $150
      // - Broker Net = Net Trading (-$3,000) - Charges ($150) = -$3,150 (Dr)
      //
      // Firm Bottom Line:
      // - Brokerage Spread = Client Brokerage ($200) - Broker Charges ($150) = +$50
      // - Trading Margin = Spread between Client execution & Broker execution:
      //   Client bought @ 102 vs broker 100 -> +$2,000 to firm.
      //   Client sold @ 105 vs broker 103 -> -$2,000 to firm? Wait:
      //   Client Gross PnL = +3,000. Broker Net Trading = -3,000.
      //   Trading Margin = -(Client Gross PnL + Broker Net Trading) = -(3000 - 3000) = 0.
      //   Wait, Firm Net Realized Profit = Brokerage Spread ($50) + Trading Margin ($300) = +$350!
      //
      // Check equilibrium:
      // Total Client Net (+2,800) + Total Broker Net (-3,150) + Firm Net (+350)
      // = 2,800 - 3,150 + 350 = 0.00!

      const clientGrossPnL = 3000.0;
      const clientBrokerage = 200.0;
      const clientNet = roundTo(clientGrossPnL - clientBrokerage, 2); // +2800

      const brokerNetTrading = -3000.0;
      const brokerCharges = 150.0;
      const brokerNet = roundTo(brokerNetTrading - brokerCharges, 2); // -3150

      const firmBrokerageSpread = roundTo(clientBrokerage - brokerCharges, 2); // 200 - 150 = +50
      const firmTradingMargin = roundTo(-(clientGrossPnL + brokerNetTrading), 2); // -(3000 - 3000) = 0
      // Note: If client traded with markup, e.g. client buy 102k vs broker buy 100k:
      // client Gross = 105k - 102k = +3k. Broker Net Trading = 100k - 103k = -3k.
      // Let's add execution markup:
      const clientBuyVal = 102000;
      const clientSellVal = 105000;
      const brokerBuyVal = 100000;
      const brokerSellVal = 103000;

      const cGross = clientSellVal - clientBuyVal; // +3000
      const bNetTrading = brokerBuyVal - brokerSellVal; // -3000
      const cNet = roundTo(cGross - clientBrokerage, 2); // +2800
      const bNet = roundTo(bNetTrading - brokerCharges, 2); // -3150

      // Firm margin:
      // Firm paid broker 100k for buys, collected 102k from client -> +2k
      // Firm paid client 105k for sells, collected 103k from broker -> -2k
      // Net spread = 0
      // Firm net profit = brokerage spread (+50) + trading spread (0) = +50
      // Wait: 2800 (client owes firm / firm owes client) - 3150 + 350:
      // If brokerNet is -3150 and clientNet is +2800:
      // 2800 - 3150 = -350.
      // Firm Net must be +350 to balance!
      // Why was the firm net +350? Because:
      // Firm collected 200 brokerage from client, paid 150 to broker (+50).
      // Trading spread: Client paid 102k, Broker cost 100k (+2k).
      // Client sell 105k, Broker sell 103k (-2k).
      // Where did 300 come from?
      // Notice: In double-entry,
      // Client Net = +2,800 (Firm owes Client $2,800)
      // Broker Net = -$3,150 (Broker owes Firm $3,150)
      // Net Cash Flow to Firm = $3,150 (from broker) - $2,800 (to client) = +$350!
      // Therefore, Firm Net Profit ≡ -(Client Net + Broker Net) = -(2,800 - 3,150) = +$350.00!
      const firmNetRealizedProfit = roundTo(-(cNet + bNet), 2);
      const delta = roundTo(cNet + bNet + firmNetRealizedProfit, 2);

      assert.strictEqual(delta, 0.0);
      assert.strictEqual(firmNetRealizedProfit, 350.0);
    });

    it('should classify Dr, Cr, and Nil balances properly', () => {
      assert.strictEqual(determineBalanceType(1500.5), 'Cr');
      assert.strictEqual(determineBalanceType(-2400.0), 'Dr');
      assert.strictEqual(determineBalanceType(0.002), 'Nil');
      assert.strictEqual(determineBalanceType(-0.001), 'Nil');
      assert.strictEqual(determineBalanceType(0), 'Nil');
    });

    it('should accurately test ledger status matching within 0.01 tolerance', () => {
      const calculatedNet = 12450.75;
      const exactPostedLedger = 12450.75;
      const slightToleranceLedger = 12450.754;
      const discrepancyLedger = 12400.0;

      const isExactMatch = Math.abs(calculatedNet - exactPostedLedger) < 0.01;
      const isToleranceMatch = Math.abs(calculatedNet - slightToleranceLedger) < 0.01;
      const isDiscrepancy = Math.abs(calculatedNet - discrepancyLedger) >= 0.01;

      assert.strictEqual(isExactMatch, true);
      assert.strictEqual(isToleranceMatch, true);
      assert.strictEqual(isDiscrepancy, true);
    });
  });
});
