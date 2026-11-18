import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateSecurityName, formatExpiryToDDMMMYY } from './securityName';

describe('securityName.ts - Web Frontend Security Name Generator', () => {
  it('generates canonical security name for options', () => {
    const name = generateSecurityName({
      scriptFullName: 'GOLD 1KG',
      expiry: '2026-05-28',
      callPut: 'CALL',
      strikePrice: 2400,
    });
    assert.strictEqual(name, 'GOLD 1KG 28MAY26 CALL 2400');
  });

  it('generates futures security name without call/put and strike', () => {
    const name = generateSecurityName({
      scriptFullName: 'SILVER 30KG',
      expiry: '28MAY26',
    });
    assert.strictEqual(name, 'SILVER 30KG 28MAY26');
  });

  it('normalizes various date inputs into DDMMMYY format', () => {
    assert.strictEqual(formatExpiryToDDMMMYY('28MAY26'), '28MAY26');
    assert.strictEqual(formatExpiryToDDMMMYY('2026-05-28'), '28MAY26');
    assert.strictEqual(formatExpiryToDDMMMYY(new Date(Date.UTC(2026, 4, 28))), '28MAY26');
  });

  it('handles edge cases with empty or invalid inputs', () => {
    assert.strictEqual(generateSecurityName({}), '');
    assert.strictEqual(formatExpiryToDDMMMYY(null), '');
  });
});
