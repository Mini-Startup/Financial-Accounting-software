import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  escapeCsvCell,
  generateCsvString,
  formatExportFilename,
} from './ReportExportUtils';

describe('ReportExportUtils — CSV Export Engine & RFC 4180 Compliance', () => {
  describe('escapeCsvCell', () => {
    it('should return empty string for null and undefined', () => {
      assert.strictEqual(escapeCsvCell(null), '');
      assert.strictEqual(escapeCsvCell(undefined), '');
    });

    it('should pass normal alphanumeric strings and numbers unmodified', () => {
      assert.strictEqual(escapeCsvCell('ACC-001'), 'ACC-001');
      assert.strictEqual(escapeCsvCell(12345.67), '12345.67');
      assert.strictEqual(escapeCsvCell(0), '0');
    });

    it('should wrap cells containing commas in double quotes', () => {
      assert.strictEqual(escapeCsvCell('Acme Corp, LLC'), '"Acme Corp, LLC"');
      assert.strictEqual(escapeCsvCell('1,000.00'), '"1,000.00"');
    });

    it('should escape internal double quotes by doubling them according to RFC 4180', () => {
      assert.strictEqual(escapeCsvCell('Gold "Mini" 100g'), '"Gold ""Mini"" 100g"');
      assert.strictEqual(escapeCsvCell('He said, "Hello"'), '"He said, ""Hello"""');
    });

    it('should wrap cells containing newlines in double quotes', () => {
      assert.strictEqual(escapeCsvCell("Line 1\nLine 2"), '"Line 1\nLine 2"');
      assert.strictEqual(escapeCsvCell("Line 1\r\nLine 2"), '"Line 1\r\nLine 2"');
    });
  });

  describe('generateCsvString', () => {
    it('should prefix CSV output with UTF-8 BOM (\\uFEFF) for Microsoft Excel compatibility', () => {
      const headers = ['Client Code', 'Client Name'];
      const rows = [['ACC-001', 'Alpha Corp']];
      const csv = generateCsvString(headers, rows);

      assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM \\uFEFF');
      assert.strictEqual(csv.charCodeAt(0), 0xfeff);
    });

    it('should separate lines with CRLF (\\r\\n) and columns with commas', () => {
      const headers = ['Date', 'Security', 'Net Qty', 'PnL'];
      const rows = [
        ['18-11-26', 'GOLD 28FEB26', 10, 4500.5],
        ['18-11-26', 'SILVER 28MAR26', -5, -1200.0],
      ];
      const csv = generateCsvString(headers, rows);
      const lines = csv.replace('\uFEFF', '').split('\r\n');

      assert.strictEqual(lines.length, 3);
      assert.strictEqual(lines[0], 'Date,Security,Net Qty,PnL');
      assert.strictEqual(lines[1], '18-11-26,GOLD 28FEB26,10,4500.5');
      assert.strictEqual(lines[2], '18-11-26,SILVER 28MAR26,-5,-1200');
    });

    it('should properly format complex rows with commas, quotes, and negative values', () => {
      const headers = ['Entity', 'Description', 'Amount'];
      const rows = [
        ['Apex, Broker', 'Settlement fee "A"', -250.75],
      ];
      const csv = generateCsvString(headers, rows);
      const lines = csv.replace('\uFEFF', '').split('\r\n');

      assert.strictEqual(lines[1], '"Apex, Broker","Settlement fee ""A""",-250.75');
    });
  });

  describe('formatExportFilename', () => {
    it('should construct a filename containing sanitized base name and DD-MM-YY date', () => {
      const filename = formatExportFilename('Net Position Report', 'CLIENT');
      assert.ok(filename.startsWith('Net_Position_Report_CLIENT_'));
      assert.ok(filename.endsWith('.csv'));

      // Validate date component matches DD-MM-YY format (e.g. 18-11-26)
      const datePart = filename.replace('Net_Position_Report_CLIENT_', '').replace('.csv', '');
      assert.match(datePart, /^\d{2}-\d{2}-\d{2}$/);
    });

    it('should handle filenames without optional suffix', () => {
      const filename = formatExportFilename('Financial Settlement Sheet');
      assert.ok(filename.startsWith('Financial_Settlement_Sheet_'));
      assert.ok(filename.endsWith('.csv'));
    });
  });
});
