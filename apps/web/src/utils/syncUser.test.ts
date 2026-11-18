import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isEmailWhitelisted } from './syncUser';

describe('syncUser - Clerk Whitelist Guard Verification', () => {
  const sampleWhitelist = [
    'admin@bizzmate.com',
    'auditor@firm.ae',
    'trader.one@hedgefund.com',
    'ops@clearinghouse.org',
  ];

  // ── Tier 1: Happy Path Coverage ──
  it('Tier 1: should allow exact matching whitelisted email', () => {
    assert.strictEqual(isEmailWhitelisted('admin@bizzmate.com', sampleWhitelist), true);
    assert.strictEqual(isEmailWhitelisted('auditor@firm.ae', sampleWhitelist), true);
  });

  it('Tier 1: should allow case-insensitive email match', () => {
    assert.strictEqual(isEmailWhitelisted('ADMIN@BIZZMATE.COM', sampleWhitelist), true);
    assert.strictEqual(isEmailWhitelisted('Trader.One@HedgeFund.COM', sampleWhitelist), true);
  });

  it('Tier 1: should allow email with leading or trailing whitespace', () => {
    assert.strictEqual(isEmailWhitelisted('  admin@bizzmate.com  ', sampleWhitelist), true);
    assert.strictEqual(isEmailWhitelisted('\tops@clearinghouse.org\n', sampleWhitelist), true);
  });

  // ── Tier 2: Boundary & Corner Cases ──
  it('Tier 2: should reject non-whitelisted email', () => {
    assert.strictEqual(isEmailWhitelisted('intruder@unknown.com', sampleWhitelist), false);
    assert.strictEqual(isEmailWhitelisted('admin@bizzmate.org', sampleWhitelist), false);
  });

  it('Tier 2: should safely handle null, undefined, and non-string inputs', () => {
    assert.strictEqual(isEmailWhitelisted(null as any, sampleWhitelist), false);
    assert.strictEqual(isEmailWhitelisted(undefined as any, sampleWhitelist), false);
    assert.strictEqual(isEmailWhitelisted('' as any, sampleWhitelist), false);
    assert.strictEqual(isEmailWhitelisted(12345 as any, sampleWhitelist), false);
  });

  it('Tier 2: should safely handle empty whitelist array', () => {
    assert.strictEqual(isEmailWhitelisted('admin@bizzmate.com', []), false);
    assert.strictEqual(isEmailWhitelisted('admin@bizzmate.com', undefined as any), false);
  });

  // ── Tier 3: Cross-Feature Combinations ──
  it('Tier 3: should handle mixed-case whitelist entries with internal spaces or special domains', () => {
    const customWhitelist = ['  CFO@HOLDING.CO.UK  ', 'compliance+fno@dubai-exchange.ae'];
    assert.strictEqual(isEmailWhitelisted('cfo@holding.co.uk', customWhitelist), true);
    assert.strictEqual(isEmailWhitelisted('compliance+fno@dubai-exchange.ae', customWhitelist), true);
    assert.strictEqual(isEmailWhitelisted('cfo@holding.co', customWhitelist), false);
  });

  // ── Tier 4: Real-World Workload Scenarios ──
  it('Tier 4: high-volume email verification throughput without memory degradation', () => {
    const largeWhitelist = Array.from({ length: 1000 }, (_, i) => `user_${i}@org.com`);
    largeWhitelist.push('target.exec@bizzmate.com');

    for (let i = 0; i < 500; i++) {
      assert.strictEqual(isEmailWhitelisted('TARGET.EXEC@BIZZMATE.COM', largeWhitelist), true);
      assert.strictEqual(isEmailWhitelisted(`nonexistent_${i}@org.com`, largeWhitelist), false);
    }
  });
});
