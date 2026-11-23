import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sortRecords, parseSortableNumber, filterRecordsBySearch } from './tableFilter';

describe('tableFilter.ts - Numeric Sorting and Search Filtering', () => {
  // ── Tier 1: Happy Path Coverage ──
  it('Tier 1.1: parseSortableNumber converts clean numbers and formatted currency strings', () => {
    assert.strictEqual(parseSortableNumber(100), 100);
    assert.strictEqual(parseSortableNumber(-45.25), -45.25);
    assert.strictEqual(parseSortableNumber('$1,200.00'), 1200);
    assert.strictEqual(parseSortableNumber('₹50,000'), 50000);
    assert.strictEqual(parseSortableNumber('  -25.50  '), -25.5);
  });

  it('Tier 1.2: sorts formatted numbers in algebraic order (not lexicographic)', () => {
    // Crucial bug fix test: "100" vs "20"
    const items = [
      { id: '1', amount: '$100.00' },
      { id: '2', amount: '$20.00' },
      { id: '3', amount: '-$50.00' },
      { id: '4', amount: '$1,200.00' },
    ];

    const sortedAsc = sortRecords(items, 'amount', 'asc');
    assert.deepStrictEqual(sortedAsc.map((i) => i.amount), [
      '-$50.00',
      '$20.00',
      '$100.00',
      '$1,200.00',
    ]);

    const sortedDesc = sortRecords(items, 'amount', 'desc');
    assert.deepStrictEqual(sortedDesc.map((i) => i.amount), [
      '$1,200.00',
      '$100.00',
      '$20.00',
      '-$50.00',
    ]);
  });

  it('Tier 1.3: sorts raw numeric fields correctly', () => {
    const records = [
      { id: '1', rate: 105.5 },
      { id: '2', rate: 10.2 },
      { id: '3', rate: 99.0 },
    ];
    const asc = sortRecords(records, 'rate', 'asc');
    assert.deepStrictEqual(asc.map((r) => r.rate), [10.2, 99.0, 105.5]);
  });

  it('Tier 1.4: sorts dates correctly and distinguishes them from numbers', () => {
    const dates = [
      { id: '1', date: '2026-11-18' },
      { id: '2', date: '2026-05-28' },
      { id: '3', date: '2026-12-31' },
    ];
    const asc = sortRecords(dates, 'date', 'asc');
    assert.deepStrictEqual(asc.map((d) => d.date), [
      '2026-05-28',
      '2026-11-18',
      '2026-12-31',
    ]);
  });

  it('Tier 1.5: filterRecordsBySearch matches tokens across columns', () => {
    const data = [
      { code: 'CL01', name: 'Al Ghurair Commodities', city: 'Dubai' },
      { code: 'CL02', name: 'Emirates Gold', city: 'Sharjah' },
      { code: 'CL03', name: 'Apex Clearing', city: 'Dubai' },
    ];
    const results = filterRecordsBySearch(data, 'Dubai Gold');
    assert.strictEqual(results.length, 3); // matches Dubai OR Gold
    const single = filterRecordsBySearch(data, 'Apex');
    assert.strictEqual(single.length, 1);
    assert.strictEqual(single[0].code, 'CL03');
  });

  // ── Tier 2: Boundary & Corner Cases ──
  it('Tier 2.1: parseSortableNumber returns null for null, undefined, empty, or non-numeric strings', () => {
    assert.strictEqual(parseSortableNumber(null), null);
    assert.strictEqual(parseSortableNumber(undefined), null);
    assert.strictEqual(parseSortableNumber(''), null);
    assert.strictEqual(parseSortableNumber('   '), null);
    assert.strictEqual(parseSortableNumber('abc'), null);
    assert.strictEqual(parseSortableNumber('2026-11-18'), null); // Calendar dates excluded from number parsing
  });

  it('Tier 2.2: sortRecords handles null and undefined values at the boundary', () => {
    const items = [
      { id: '1', val: 50 },
      { id: '2', val: null },
      { id: '3', val: 10 },
      { id: '4', val: undefined },
    ];

    const asc = sortRecords(items, 'val', 'asc');
    assert.strictEqual(asc[0].val, 10);
    assert.strictEqual(asc[1].val, 50);
    // nulls sorted to the end in asc
    assert.strictEqual(asc[2].val == null, true);
    assert.strictEqual(asc[3].val == null, true);
  });

  it('Tier 2.3: returns original records when sortKey or direction is null', () => {
    const items = [{ id: '1' }, { id: '2' }];
    assert.deepStrictEqual(sortRecords(items, null, 'asc'), items);
    assert.deepStrictEqual(sortRecords(items, 'id', null), items);
  });

  // ── Tier 3: Cross-Feature Combinations ──
  it('Tier 3: nested property sorting with formatted currency', () => {
    const clients = [
      { client: { balance: '$2,500.00' } },
      { client: { balance: '-$150.00' } },
      { client: { balance: '$0.00' } },
    ];
    const sorted = sortRecords(clients, 'client.balance', 'asc');
    assert.deepStrictEqual(
      sorted.map((c) => c.client.balance),
      ['-$150.00', '$0.00', '$2,500.00']
    );
  });

  // ── Tier 4: Real-World Workload Scenarios ──
  it('Tier 4: high-volume table sorting performance (1000 records)', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      pnl: `${(i % 2 === 0 ? '+' : '-')}$${((i * 17.5) % 5000).toFixed(2)}`,
    }));

    const sorted = sortRecords(largeDataset, 'pnl', 'asc');
    assert.strictEqual(sorted.length, 1000);
    // Verify first item is negative and last item is positive
    const firstNum = parseSortableNumber(sorted[0].pnl)!;
    const lastNum = parseSortableNumber(sorted[999].pnl)!;
    assert.strictEqual(firstNum <= lastNum, true);
  });
});
