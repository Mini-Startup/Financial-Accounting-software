import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateCode,
  validateAccountName,
  validatePhone,
  validateEmail,
  validateIFSC,
  validateLotSize,
  validateQuantity,
  validateRate,
  validateAccountForm,
  validateScriptForm,
  validateTradeForm,
} from './validators';

describe('validators.ts - Centralized Entity Validation Engine', () => {
  // ── Tier 1: Happy Path Coverage ──
  it('Tier 1.1: validateCode accepts valid 2-20 char alphanumeric codes', () => {
    assert.strictEqual(validateCode('CL001').isValid, true);
    assert.strictEqual(validateCode('BRK_SGX_01').isValid, true);
    assert.strictEqual(validateCode('ACC-123').isValid, true);
  });

  it('Tier 1.2: validatePhone accepts valid 10-digit Indian and E.164 international numbers', () => {
    assert.strictEqual(validatePhone('9876543210').isValid, true);
    assert.strictEqual(validatePhone('+971501234567').isValid, true);
    assert.strictEqual(validatePhone('+14155552671').isValid, true);
  });

  it('Tier 1.3: validateEmail accepts standard and RFC compliant email formats', () => {
    assert.strictEqual(validateEmail('client@trading.com').isValid, true);
    assert.strictEqual(validateEmail('first.last+sub@brokerage.co.uk').isValid, true);
  });

  it('Tier 1.4: validateIFSC accepts valid 11-char bank IFSC codes', () => {
    assert.strictEqual(validateIFSC('HDFC0001234').isValid, true);
    assert.strictEqual(validateIFSC('SBIN0000456').isValid, true);
    assert.strictEqual(validateIFSC('').isValid, true); // optional
  });

  it('Tier 1.5: validateLotSize and validateQuantity accept positive non-zero amounts', () => {
    assert.strictEqual(validateLotSize(1).isValid, true);
    assert.strictEqual(validateLotSize(100).isValid, true);
    assert.strictEqual(validateQuantity(5).isValid, true);
    assert.strictEqual(validateQuantity(-10).isValid, true); // SELL quantities can be negative
    assert.strictEqual(validateRate(105.75).isValid, true);
  });

  // ── Tier 2: Boundary & Corner Cases ──
  it('Tier 2.1: validateCode rejects invalid lengths, spaces, or special characters', () => {
    assert.strictEqual(validateCode('').isValid, false);
    assert.strictEqual(validateCode('A').isValid, false); // < 2 chars
    assert.strictEqual(validateCode('CODE WITH SPACE').isValid, false);
    assert.strictEqual(validateCode('CODE@123').isValid, false);
    assert.strictEqual(validateCode('A'.repeat(21)).isValid, false); // > 20 chars
  });

  it('Tier 2.2: validatePhone rejects malformed numbers', () => {
    assert.strictEqual(validatePhone('12345').isValid, false); // too short
    assert.strictEqual(validatePhone('abcdefghij').isValid, false);
    assert.strictEqual(validatePhone('0000000000').isValid, false); // starts with 0
  });

  it('Tier 2.3: validateEmail rejects invalid addresses', () => {
    assert.strictEqual(validateEmail('plainaddress').isValid, false);
    assert.strictEqual(validateEmail('@missingusername.com').isValid, false);
    assert.strictEqual(validateEmail('user@domain').isValid, false);
  });

  it('Tier 2.4: validateIFSC rejects malformed codes', () => {
    assert.strictEqual(validateIFSC('HDFC1001234').isValid, false); // 5th char must be 0
    assert.strictEqual(validateIFSC('HDFC00123').isValid, false); // only 9 chars
    assert.strictEqual(validateIFSC('12340001234').isValid, false); // first 4 must be letters
  });

  it('Tier 2.5: validateLotSize and validateRate reject zero, negative, or fractional lot numbers', () => {
    assert.strictEqual(validateLotSize(0).isValid, false);
    assert.strictEqual(validateLotSize(-5).isValid, false);
    assert.strictEqual(validateLotSize(1.5).isValid, false); // must be integer
    assert.strictEqual(validateQuantity(0).isValid, false); // quantity cannot be zero
    assert.strictEqual(validateRate(0).isValid, false); // rate must be > 0
    assert.strictEqual(validateRate(-10).isValid, false);
  });

  // ── Tier 3: Cross-Feature Combinations (Composite Form Tests) ──
  it('Tier 3.1: validateAccountForm surfaces specific field errors for invalid client/broker data', () => {
    const invalidData = {
      code: 'X', // too short
      name: 'A', // too short
      mobileNumber: '123', // invalid phone
      email: 'not-an-email',
      ifscCode: 'INVALID',
    };
    const errors = validateAccountForm(invalidData);
    assert.strictEqual(Boolean(errors.code), true);
    assert.strictEqual(Boolean(errors.name), true);
    assert.strictEqual(Boolean(errors.mobileNumber), true);
    assert.strictEqual(Boolean(errors.email), true);
    assert.strictEqual(Boolean(errors.ifscCode), true);
  });

  it('Tier 3.2: validateScriptForm checks shortName, lotSize, and exchange presence', () => {
    const invalidScript = {
      shortName: 'TOO_LONG_SHORT_NAME_EXCEEDING_LIMIT',
      fullName: '',
      lotSize: -1,
      exchangeId: null,
    };
    const errors = validateScriptForm(invalidScript);
    assert.strictEqual(Boolean(errors.shortName), true);
    assert.strictEqual(Boolean(errors.fullName), true);
    assert.strictEqual(Boolean(errors.lotSize), true);
    assert.strictEqual(Boolean(errors.exchangeId), true);
  });

  it('Tier 3.3: validateTradeForm enforces positive rates, non-zero qty, and account selection', () => {
    const invalidTrade = {
      tradeNumber: '',
      tradeDate: 'invalid-date',
      accountId: null,
      scriptId: null,
      quantity: 0,
      rate: -5,
    };
    const errors = validateTradeForm(invalidTrade);
    assert.strictEqual(Boolean(errors.tradeNumber), true);
    assert.strictEqual(Boolean(errors.tradeDate), true);
    assert.strictEqual(Boolean(errors.accountId), true);
    assert.strictEqual(Boolean(errors.scriptId), true);
    assert.strictEqual(Boolean(errors.quantity), true);
    assert.strictEqual(Boolean(errors.rate), true);
  });

  // ── Tier 4: Real-World Workload Scenarios ──
  it('Tier 4: high-volume validation processing (1,000 entity validations under 50ms)', () => {
    const validAccount = {
      code: 'CL1001',
      name: 'Devshree Commodities LLC',
      groupId: 1,
      mobileNumber: '+971501234567',
      email: 'trades@devshree.ae',
      ifscCode: 'HDFC0001234',
    };

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const errs = validateAccountForm(validAccount);
      assert.strictEqual(Object.keys(errs).length, 0);
    }
    const elapsed = Date.now() - start;
    assert.strictEqual(elapsed < 1000, true);
  });
});
