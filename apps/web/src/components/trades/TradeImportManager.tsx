'use client';

import { useState } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, ArrowLeft, Upload, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import './trades-import.css';

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'RESULT';

export function TradeImportManager() {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [normalizedRows, setNormalizedRows] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ importedCount: number; failedCount: number } | null>(null);

  const handleFileRead = async (content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);
    try {
      // 1. Upload to parse CSV
      const uploadRes = await fetch('http://localhost:4000/trade-import/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.message || 'Failed to parse CSV file');
      }

      const rows = await uploadRes.json();
      setNormalizedRows(rows);

      // 2. Fetch preview validations
      const previewRes = await fetch('http://localhost:4000/trade-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!previewRes.ok) {
        const err = await previewRes.json();
        throw new Error(err.message || 'Failed to validate preview rows');
      }

      const previewData = await previewRes.json();
      setPreviewRows(previewData);
      setStep('PREVIEW');
      toast.success('File parsed successfully. Review your trades below.');
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file');
      setFileName('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:4000/trade-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: normalizedRows }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to confirm import');
      }

      const result = await res.json();
      setImportResult(result);
      setStep('RESULT');
      toast.success(`Import completed! ${result.importedCount} trades created.`);
    } catch (err: any) {
      toast.error(err.message || 'Error confirming import');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('UPLOAD');
    setFileName('');
    setNormalizedRows([]);
    setPreviewRows([]);
    setImportResult(null);
  };

  // Compute stats
  const totalRows = previewRows.length;
  const validRowsCount = previewRows.filter(r => r.status === 'Valid').length;
  const invalidRowsCount = totalRows - validRowsCount;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6">
        <div>
          <h1 className="text-h2 font-display">Trade Import</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            {step === 'UPLOAD' && 'Upload files exported from your broker (CSV or Text format).'}
            {step === 'PREVIEW' && `Preview and validate trades from ${fileName} before importing.`}
            {step === 'RESULT' && 'Import complete. Review execution results below.'}
          </p>
        </div>

        {step === 'PREVIEW' && (
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="btn btn--secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={validRowsCount === 0 || isProcessing}
              className="btn btn--primary flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Importing…
                </>
              ) : (
                <>
                  Import {validRowsCount} Valid Trades
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Wizard Steps */}
      {step === 'UPLOAD' && (
        <div className="max-w-2xl mx-auto py-10">
          <div className="card p-8">
            <FileUploadZone onFileRead={handleFileRead} isProcessing={isProcessing} />
          </div>
        </div>
      )}

      {step === 'PREVIEW' && (
        <div className="space-y-6">
          {/* Stats Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-[var(--color-snow)]">
              <div className="card__body p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">📂</div>
                <div>
                  <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Total Rows</div>
                  <div className="text-lg font-bold text-[var(--color-charcoal)]">{totalRows}</div>
                </div>
              </div>
            </div>

            <div className="card bg-[var(--color-snow)]">
              <div className="card__body p-4 flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Valid Rows</div>
                  <div className="text-lg font-bold text-[var(--color-positive)]">{validRowsCount}</div>
                </div>
              </div>
            </div>

            <div className="card bg-[var(--color-snow)]">
              <div className="card__body p-4 flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Invalid Rows</div>
                  <div className="text-lg font-bold text-[var(--color-negative)]">{invalidRowsCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="card">
            <div className="card__body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trade No</th>
                    <th>Client</th>
                    <th>Script</th>
                    <th>Exchange</th>
                    <th>Buy/Sell</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Rate</th>
                    <th>Status</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        row.status === 'Invalid' ? 'bg-red-50/20' : 'hover:bg-[var(--color-snow)]'
                      )}
                    >
                      <td className="font-mono text-xs">{row.tradeNumber}</td>
                      <td className="font-mono text-xs">{row.clientCode}</td>
                      <td className="font-semibold text-xs">{row.scriptCode}</td>
                      <td className="font-bold text-xs">{row.exchange}</td>
                      <td>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                            row.buySell === 'BUY'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          )}
                        >
                          {row.buySell}
                        </span>
                      </td>
                      <td className="text-right font-mono font-semibold text-xs">{row.quantity}</td>
                      <td className="text-right font-mono font-semibold text-xs">₹{row.rate.toFixed(2)}</td>
                      <td>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-semibold',
                            row.status === 'Valid'
                              ? 'text-[var(--color-positive)]'
                              : 'text-[var(--color-negative)]'
                          )}
                        >
                          {row.status === 'Valid' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" /> Invalid
                            </>
                          )}
                        </span>
                      </td>
                      <td className="text-xs text-[var(--color-negative)] max-w-[250px] truncate" title={row.errors.join(', ')}>
                        {row.errors.length > 0 ? row.errors.join(', ') : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'RESULT' && importResult && (
        <div className="max-w-md mx-auto py-10">
          <div className="card text-center p-8 space-y-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-[var(--color-positive)] mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-charcoal)]">Import Completed Successfully</h2>
              <p className="text-sm text-[var(--color-slate)] mt-2">
                Processed trade file: <span className="font-semibold">{fileName}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-[var(--color-border-light)] py-4">
              <div>
                <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Imported</div>
                <div className="text-2xl font-bold text-[var(--color-positive)]">{importResult.importedCount}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Skipped (Errors)</div>
                <div className="text-2xl font-bold text-[var(--color-negative)]">{importResult.failedCount}</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button onClick={handleReset} className="btn btn--primary flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
