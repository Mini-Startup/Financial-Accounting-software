import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatDateToDDMMYY,
  formatDateForInput,
  parseDateDetailed,
  validateExpiryAgainstTradeDate,
  formatDateToSecurityDate,
} from './dateUtils';

describe('dateUtils.ts - Global Date Formatting & Sanitization', () => {
  describe('formatDateToDDMMYY - Strict DD-MM-YY Display (Bans ISO strings)', () => {
    it('formats ISO 8601 strings with full time and UTC timezone (PostgreSQL/Prisma format)', () => {
      assert.strictEqual(formatDateToDDMMYY('2026-10-02T00:00:00.000Z'), '02-10-26');
      assert.strictEqual(formatDateToDDMMYY('2026-12-15T00:00:00.000Z'), '15-12-26');
      assert.strictEqual(formatDateToDDMMYY('2025-01-05T14:30:22.123Z'), '05-01-25');
    });

    it('formats simple YYYY-MM-DD strings', () => {
      assert.strictEqual(formatDateToDDMMYY('2026-10-02'), '02-10-26');
      assert.strictEqual(formatDateToDDMMYY('2024-02-29'), '29-02-24');
    });

    it('formats Date instances safely', () => {
      const d = new Date('2026-10-02T00:00:00.000Z');
      assert.strictEqual(formatDateToDDMMYY(d), '02-10-26');
    });

    it('normalizes DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, and 2-digit years', () => {
      assert.strictEqual(formatDateToDDMMYY('02-10-2026'), '02-10-26');
      assert.strictEqual(formatDateToDDMMYY('2/10/26'), '02-10-26');
      assert.strictEqual(formatDateToDDMMYY('15.12.2026'), '15-12-26');
      assert.strictEqual(formatDateToDDMMYY('25-10-26'), '25-10-26');
    });

    it('formats DD-MMM-YY strings', () => {
      assert.strictEqual(formatDateToDDMMYY('02-OCT-26'), '02-10-26');
      assert.strictEqual(formatDateToDDMMYY('15-DEC-2026'), '15-12-26');
    });

    it('safely handles empty, null, or undefined values without crashing', () => {
      assert.strictEqual(formatDateToDDMMYY(''), '');
      assert.strictEqual(formatDateToDDMMYY(null), '');
      assert.strictEqual(formatDateToDDMMYY(undefined), '');
    });

    it('never leaks raw ISO timestamps or T strings if unparseable', () => {
      assert.strictEqual(formatDateToDDMMYY('INVALID_DATE_STRING_T00:00:00Z'), '');
    });
  });

  describe('formatDateForInput - HTML Date Input (YYYY-MM-DD)', () => {
    it('converts ISO timestamps into clean YYYY-MM-DD', () => {
      assert.strictEqual(formatDateForInput('2026-10-02T00:00:00.000Z'), '2026-10-02');
      assert.strictEqual(formatDateForInput('2026-12-15T00:00:00.000Z'), '2026-12-15');
    });

    it('converts DD-MM-YY into YYYY-MM-DD', () => {
      assert.strictEqual(formatDateForInput('02-10-26'), '2026-10-02');
    });
  });

  describe('validateExpiryAgainstTradeDate', () => {
    it('allows expiry after or equal to trade date', () => {
      assert.strictEqual(
        validateExpiryAgainstTradeDate('2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
        null
      );
      assert.strictEqual(
        validateExpiryAgainstTradeDate('2026-10-02T00:00:00.000Z', '2026-12-15T00:00:00.000Z'),
        null
      );
    });

    it('rejects expiry before trade date', () => {
      const err = validateExpiryAgainstTradeDate('2026-10-02T00:00:00.000Z', '2026-09-15T00:00:00.000Z');
      assert.strictEqual(err, 'Expiry date cannot be before the trade date');
    });
  });
});
