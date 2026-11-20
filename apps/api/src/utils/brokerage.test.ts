import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateBrokerBrokerage,
  calculateClientBrokerage,
  calculateTradeRates,
  round,
} from './brokerage';

describe('brokerage.ts - Calculation Formula and Trade Rate Engine', () => {
  // ── Tier 1: Happy Path Coverage ──
  it('Tier 1.1: sums 4 broker charges directly without marketLot multiplier', () => {
    // 0.25 commission + 0.10 exCharge + 0.05 charge1 + 0.02 charge2 = 0.42
    const charges = calculateBrokerBrokerage(0.25, 0.10, 0.05, 0.02);
    assert.strictEqual(charges, 0.42);
  });

  it('Tier 1.2: keeps broker rate equal to execution rate and stores total broker charges', () => {
    // BUY 10 lots of 100 units at 50.00 with 0.42 total charges
    const result = calculateTradeRates({
      rate: 50.0,
      quantity: 10,
      marketLot: 100,
      side: 'BUY',
      brokerBrokerage: 0.42,
    });

    assert.strictEqual(result.brokerRate, 50.0); // Clean execution rate (Option A)
    assert.strictEqual(result.totalUnits, 1000);
    assert.strictEqual(result.brokerBrokerage, 0.42); // Total dollar charges, not multiplied by totalUnits
    assert.strictEqual(result.brokerMarketValue, 50000.0);
  });

  it('Tier 1.3: keeps broker rate equal to execution rate on SELL as well', () => {
    // SELL 5 lots of 50 units at 100.00 with 0.50 total charges
    const result = calculateTradeRates({
      rate: 100.0,
      quantity: 5,
      marketLot: 50,
      side: 'SELL',
      brokerBrokerage: 0.50,
    });

    assert.strictEqual(result.brokerRate, 100.0);
    assert.strictEqual(result.totalUnits, 250);
    assert.strictEqual(result.brokerBrokerage, 0.50);
    assert.strictEqual(result.brokerMarketValue, 25000.0);
  });

  it('Tier 1.4: calculates client brokerage with rule-based per-share adjustment', () => {
    // Client rule: 10 per 1 lot, marketLot = 50 -> per-share adjustment = (10 / 1) / 50 = 0.20
    const result = calculateTradeRates({
      rate: 100.0,
      quantity: 2,
      marketLot: 50,
      side: 'BUY',
      clientRule: {
        quantity: 1,
        brokerage: 10,
        direction: 'BOTH',
      },
    });

    assert.strictEqual(result.clientPerUnit, 0.2);
    assert.strictEqual(result.clientRate, 100.2);
    assert.strictEqual(result.clientBrokerage, 20.0);
    assert.strictEqual(result.clientMarketValue, 10020.0);
  });

  it('Tier 1.5: calculates correct net profit spread between client and broker', () => {
    // BUY: Client rate 100.20, Broker rate 100.00 -> Profit = clientBrokerage (20.00) - brokerBrokerage (5.00) = 15.00
    const result = calculateTradeRates({
      rate: 100.0,
      quantity: 1,
      marketLot: 100,
      side: 'BUY',
      clientRule: { quantity: 1, brokerage: 20, direction: 'BUY' },
      brokerBrokerage: 5.00,
    });

    assert.strictEqual(result.clientRate, 100.20);
    assert.strictEqual(result.brokerRate, 100.00);
    assert.strictEqual(result.clientBrokerage, 20.0);
    assert.strictEqual(result.brokerBrokerage, 5.0);
    assert.strictEqual(result.profitTotal, 15.0);
  });

  // ── Tier 2: Boundary & Corner Cases ──
  it('Tier 2.1: handles null or undefined charge parameters gracefully', () => {
    const charges = calculateBrokerBrokerage(null, undefined, 0.15, null);
    assert.strictEqual(charges, 0.15);
    const zeroCharges = calculateBrokerBrokerage(null, null, null, null);
    assert.strictEqual(zeroCharges, 0);
  });

  it('Tier 2.2: handles zero quantity or zero lotSize gracefully', () => {
    const result = calculateTradeRates({
      rate: 75.0,
      quantity: 0,
      marketLot: 0,
      side: 'BUY',
      brokerBrokerage: 0.25,
    });

    assert.strictEqual(result.totalUnits, 0);
    assert.strictEqual(result.brokerBrokerage, 0);
    assert.strictEqual(result.marketValue, 0);
  });

  it('Tier 2.3: negative quantities are treated with absolute magnitude', () => {
    const result = calculateTradeRates({
      rate: 50.0,
      quantity: -5,
      marketLot: 10,
      side: 'SELL',
      brokerBrokerage: 0.10,
    });

    assert.strictEqual(result.quantity, 5);
    assert.strictEqual(result.totalUnits, 50);
    assert.strictEqual(result.brokerRate, 50.0);
    assert.strictEqual(result.brokerBrokerage, 0.10);
  });

  it('Tier 2.4: zero-brokerage trade types bypass all charges', () => {
    for (const tradeType of ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT']) {
      const result = calculateTradeRates({
        rate: 120.0,
        quantity: 10,
        marketLot: 25,
        side: 'BUY',
        clientRule: { quantity: 1, brokerage: 50 },
        brokerBrokerage: 1.5,
        tradeType,
      });

      assert.strictEqual(result.clientBrokerage, 0);
      assert.strictEqual(result.clientRate, 120.0);
      assert.strictEqual(result.brokerBrokerage, 0);
      assert.strictEqual(result.brokerRate, 120.0);
      assert.strictEqual(result.profitTotal, 0);
    }
  });

  it('Tier 2.5: directional client rules are strictly respected', () => {
    // BUY trade with SELL-only rule should apply zero client brokerage
    const resultBuy = calculateTradeRates({
      rate: 80.0,
      quantity: 4,
      marketLot: 10,
      side: 'BUY',
      clientRule: { quantity: 1, brokerage: 20, direction: 'SELL' },
    });
    assert.strictEqual(resultBuy.clientBrokerage, 0);
    assert.strictEqual(resultBuy.clientRate, 80.0);

    // SELL trade with SELL-only rule should apply
    const resultSell = calculateTradeRates({
      rate: 80.0,
      quantity: 4,
      marketLot: 10,
      side: 'SELL',
      clientRule: { quantity: 1, brokerage: 20, direction: 'SELL' },
    });
    assert.strictEqual(resultSell.clientBrokerage, 80.0);
  });

  // ── Tier 3: Cross-Feature Combinations ──
  it('Tier 3: verifies high precision floating point drift elimination', () => {
    // 0.1 + 0.2 floating point drift
    const rounded = round(0.1 + 0.2, 4);
    assert.strictEqual(rounded, 0.3);

    const c1 = 0.0001;
    const c2 = 0.0002;
    const c3 = 0.0003;
    const c4 = 0.0004;
    assert.strictEqual(calculateBrokerBrokerage(c1, c2, c3, c4), 0.001);
  });

  // ── Tier 4: Real-World Workload Scenarios ──
  it('Tier 4: Dubai FnO multi-lot high-value trade simulation', () => {
    // Dubai FnO trade: 250 lots of Gold (marketLot = 32) at rate 2650.75
    // 4 charges: commission 0.50, exCharge 0.25, charge1 0.10, charge2 0.05 => 0.90 total
    const charges = calculateBrokerBrokerage(0.50, 0.25, 0.10, 0.05);
    assert.strictEqual(charges, 0.90);

    const trade = calculateTradeRates({
      rate: 2650.75,
      quantity: 250,
      marketLot: 32,
      side: 'BUY',
      brokerBrokerage: charges,
      clientRule: { quantity: 1, brokerage: 40, direction: 'BOTH' }, // $40 per lot => $1.25/unit
    });

    assert.strictEqual(trade.totalUnits, 8000);
    assert.strictEqual(trade.brokerRate, 2650.75); // Clean execution rate (Option A)
    assert.strictEqual(trade.brokerBrokerage, 0.90); // Total dollar charges
    assert.strictEqual(trade.clientRate, 2652.00); // 2650.75 + 1.25
    assert.strictEqual(trade.clientBrokerage, 10000.0); // 40 * 250 lots
    assert.strictEqual(trade.profitTotal, 9999.10); // 10000 - 0.90
  });
});
