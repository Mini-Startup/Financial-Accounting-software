import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateSecurityName, formatExpiryToDDMMMYY } from './securityName';

describe('securityName.ts - Dubai FnO Canonical Security Naming Engine', () => {
  // ── Tier 1: Happy Path Coverage ──
  it('Tier 1.1: generates full options security name: [Script] [DD-MMM-YY] [Call/Put] [Strike]', () => {
    const name = generateSecurityName({
      scriptFullName: 'GOLD 1KG',
      expiry: '2026-05-28',
      callPut: 'CALL',
      strikePrice: 2400,
    });
    assert.strictEqual(name, 'GOLD 1KG 28-MAY-26 CALL 2400');
  });

  it('Tier 1.2: generates futures security name without option type and strike', () => {
    const name = generateSecurityName({
      scriptFullName: 'SILVER 30KG',
      expiry: '28MAY26',
    });
    assert.strictEqual(name, 'SILVER 30KG 28-MAY-26');
  });

  it('Tier 1.3: formats JavaScript Date object into canonical DD-MMM-YY', () => {
    const dateObj = new Date(Date.UTC(2026, 3, 28)); // 28 APR 2026
    const name = generateSecurityName({
      scriptFullName: 'CRUDE OIL',
      expiry: dateObj,
      callPut: 'PUT',
      strikePrice: 75,
    });
    assert.strictEqual(name, 'CRUDE OIL 28-APR-26 PUT 75');
  });

  it('Tier 1.4: falls back to scriptShortName when scriptFullName is missing', () => {
    const name = generateSecurityName({
      scriptShortName: 'NATGAS',
      expiry: '2026-11-18',
    });
    assert.strictEqual(name, 'NATGAS 18-NOV-26');
  });

  it('Tier 1.5: handles delMonth fallback if expiry is absent', () => {
    const name = generateSecurityName({
      scriptFullName: 'COPPER',
      delMonth: '28DEC26',
      callPut: 'CALL',
      strikePrice: 4.25,
    });
    assert.strictEqual(name, 'COPPER 28-DEC-26 CALL 4.25');
  });

  // ── Tier 2: Boundary & Corner Cases ──
  it('Tier 2.1: returns empty string when neither scriptFullName nor scriptShortName is provided', () => {
    assert.strictEqual(generateSecurityName({}), '');
    assert.strictEqual(generateSecurityName({ expiry: '28MAY26', strikePrice: 2000 }), '');
  });

  it('Tier 2.2: handles zero or negative strike price by omitting strike', () => {
    const zeroStrike = generateSecurityName({
      scriptFullName: 'GOLD',
      expiry: '28MAY26',
      callPut: 'CALL',
      strikePrice: 0,
    });
    assert.strictEqual(zeroStrike, 'GOLD 28-MAY-26 CALL');

    const negStrike = generateSecurityName({
      scriptFullName: 'GOLD',
      expiry: '28MAY26',
      strikePrice: -100,
    });
    assert.strictEqual(negStrike, 'GOLD 28-MAY-26');
  });

  it('Tier 2.3: trims excess whitespace from all inputs', () => {
    const name = generateSecurityName({
      scriptFullName: '   ALUMINIUM   ',
      expiry: '  28MAY26  ',
      callPut: '  PE  ',
      strikePrice: ' 2100 ',
    });
    assert.strictEqual(name, 'ALUMINIUM 28-MAY-26 PUT 2100');
  });

  it('Tier 2.4: formatExpiryToDDMMMYY handles invalid or null date values safely', () => {
    assert.strictEqual(formatExpiryToDDMMMYY(null), '');
    assert.strictEqual(formatExpiryToDDMMMYY(undefined), '');
    assert.strictEqual(formatExpiryToDDMMMYY(''), '');
    assert.strictEqual(formatExpiryToDDMMMYY(new Date('invalid')), '');
  });

  it('Tier 2.5: handles date format DD-MMM-YY, DD/MM/YYYY and DD-MM-YYYY', () => {
    assert.strictEqual(formatExpiryToDDMMMYY('28-MAY-26'), '28-MAY-26');
    assert.strictEqual(formatExpiryToDDMMMYY('28-MAY-2026'), '28-MAY-26');
    assert.strictEqual(formatExpiryToDDMMMYY('28/05/2026'), '28-MAY-26');
    assert.strictEqual(formatExpiryToDDMMMYY('28-05-2026'), '28-MAY-26');
  });

  // ── Tier 3: Cross-Feature Combinations ──
  it('Tier 3: standardizes all option notation variants into CALL or PUT', () => {
    const callNotations = ['C', 'CE', 'CALL', 'call', 'ce'];
    for (const cp of callNotations) {
      const name = generateSecurityName({
        scriptFullName: 'NIFTY',
        expiry: '28MAY26',
        callPut: cp,
        strikePrice: 24500,
      });
      assert.strictEqual(name, 'NIFTY 28-MAY-26 CALL 24500');
    }

    const putNotations = ['P', 'PE', 'PUT', 'put', 'pe'];
    for (const cp of putNotations) {
      const name = generateSecurityName({
        scriptFullName: 'BANKNIFTY',
        expiry: '28MAY26',
        callPut: cp,
        strikePrice: 51200,
      });
      assert.strictEqual(name, 'BANKNIFTY 28-MAY-26 PUT 51200');
    }
  });

  // ── Tier 4: Real-World Workload Scenarios ──
  it('Tier 4: high-throughput formatting matches Dubai FnO exchange format exactly', () => {
    const instruments = [
      { name: 'GOLD 1KG', exp: '2026-05-28', cp: 'CALL', sp: 2400, expected: 'GOLD 1KG 28-MAY-26 CALL 2400' },
      { name: 'SILVER 30KG', exp: '28MAY26', cp: 'PUT', sp: 32.5, expected: 'SILVER 30KG 28-MAY-26 PUT 32.5' },
      { name: 'DUBAI CRUDE', exp: '2026-06-30', cp: null, sp: null, expected: 'DUBAI CRUDE 30-JUN-26' },
      { name: 'DGCX EUR/USD', exp: '2026-09-15', cp: 'CE', sp: 1.085, expected: 'DGCX EUR/USD 15-SEP-26 CALL 1.085' },
    ];

    for (let i = 0; i < 500; i++) {
      for (const inst of instruments) {
        const secName = generateSecurityName({
          scriptFullName: inst.name,
          expiry: inst.exp,
          callPut: inst.cp,
          strikePrice: inst.sp,
        });
        assert.strictEqual(secName, inst.expected);
      }
    }
  });
});
