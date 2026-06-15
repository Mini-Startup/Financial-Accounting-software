'use client';

import { useState, useEffect } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, ArrowLeft, Upload, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/utils/cn';
import { parseTradeFile } from '../../lib/tradeParser';
import { FormModal } from '../accounts/FormModal';
import { ScriptFormModal } from '../scripts/ScriptFormModal';
import './trades-import.css';

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'RESULT';

export function TradeImportManager() {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedTrades, setParsedTrades] = useState<any[]>([]);
  const [normalizedRows, setNormalizedRows] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ importedCount: number; failedCount: number } | null>(null);

  // Auto-creation modal states
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
  const [selectedImportType, setSelectedImportType] = useState<string>('trades_fno');
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalInitialData, setClientModalInitialData] = useState<any>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptModalInitialData, setScriptModalInitialData] = useState<any>(null);

  // Load exchanges and brokers on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        
        // 1. Fetch Exchanges
        const exRes = await fetch(`${apiUrl}/exchanges`);
        if (exRes.ok) {
          const exData = await exRes.json();
          setExchanges(exData);
          if (exData.length > 0) {
            setSelectedExchangeId(exData[0].id);
          }
        }

        // 2. Fetch Brokers (Sundry Creditors)
        const brRes = await fetch(`${apiUrl}/accounts?group=Sundry Creditors`);
        if (brRes.ok) {
          const brData = await brRes.json();
          setBrokers(brData);
          if (brData.length > 0) {
            setSelectedBrokerId(brData[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  const handleFileRead = async (content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);
    try {
      // 1. Parse CSV locally on the frontend
      const parseResult = parseTradeFile(content);
      if (parseResult.trades.length === 0) {
        throw new Error('No valid trade rows found in the file structure.');
      }
      setParsedTrades(parseResult.trades);

      // 2. Fetch preview validations from the backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const previewRes = await fetch(`${apiUrl}/trade-import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parseResult.trades }),
      });

      if (!previewRes.ok) {
        const err = await previewRes.json();
        throw new Error(err.message || 'Failed to validate preview rows');
      }

      const previewData = await previewRes.json();
      setPreviewRows(previewData);
      setNormalizedRows(previewData); // store valid rows for confirm
      setStep('PREVIEW');
      toast.success('File parsed successfully. Review your trades below.');
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file');
      setFileName('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevalidate = async () => {
    if (parsedTrades.length === 0) return;
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const previewRes = await fetch(`${apiUrl}/trade-import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedTrades }),
      });

      if (!previewRes.ok) {
        const err = await previewRes.json();
        throw new Error(err.message || 'Failed to re-validate rows');
      }

      const previewData = await previewRes.json();
      setPreviewRows(previewData);
      setNormalizedRows(previewData);
      toast.success('Validation updated with latest database records.');
    } catch (err: any) {
      toast.error(err.message || 'Error re-validating trades');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/trade-import/confirm`, {
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
    setParsedTrades([]);
    setNormalizedRows([]);
    setPreviewRows([]);
    setImportResult(null);
  };

  const handleClientDoubleClick = (clientCode: string) => {
    setClientModalInitialData({
      code: clientCode,
      name: clientCode,
    });
    setShowClientModal(true);
  };

  const handleScriptDoubleClick = (shortName: string, fullName: string, exchangeCode: string) => {
    let foundExchange = exchanges.find(
      (ex) => ex.code.toUpperCase() === (exchangeCode || '').toUpperCase()
    );
    // Fallback to the user-selected exchange from the dropdown if the row doesn't have it resolved yet
    if (!foundExchange && selectedExchangeId) {
      foundExchange = exchanges.find((ex) => ex.id === selectedExchangeId);
    }
    setScriptModalInitialData({
      shortName: shortName,
      fullName: fullName,
      scriptExchangeMappings: foundExchange
        ? [
            {
              exchangeId: foundExchange.id,
              exchangeScriptCode: fullName,
            },
          ]
        : [],
    });
    setShowScriptModal(true);
  };



  // Compute stats
  const totalRows = previewRows.length;
  const validRowsCount = previewRows.filter((r) => r.status === 'Valid').length;
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
        <div className="max-w-3xl mx-auto py-6">
          <div className="card shadow-md border border-[var(--color-border-light)] p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="form-field">
                <label className="form-label form-label--required">Broker Selection</label>
                <select
                  value={selectedBrokerId}
                  onChange={(e) => setSelectedBrokerId(e.target.value)}
                  className="input"
                  disabled={isProcessing}
                >
                  <option value="" disabled>Select a Broker</option>
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>
                      {broker.code} - {broker.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label form-label--required">Exchange Selection</label>
                <select
                  value={selectedExchangeId}
                  onChange={(e) => setSelectedExchangeId(e.target.value)}
                  className="input"
                  disabled={isProcessing}
                >
                  <option value="" disabled>Select an Exchange</option>
                  {exchanges.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.code} {ex.name ? `(${ex.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label form-label--required">Import Type</label>
                <select
                  value={selectedImportType}
                  onChange={(e) => setSelectedImportType(e.target.value)}
                  className="input"
                  disabled={isProcessing}
                >
                  <option value="trades_fno">Trades (F&O)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-[var(--color-border-light)] pt-6">
              <FileUploadZone onFileRead={handleFileRead} isProcessing={isProcessing} />
            </div>
          </div>
        </div>
      )}

      {step === 'PREVIEW' && (
        <div className="space-y-6">
          {/* Stats Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-[var(--color-snow)]">
              <div className="card__body p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
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

          <div className="flex items-center justify-between text-xs text-[var(--color-slate)] italic bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <span>💡 Tip: Double-click on any red client or script code to automatically create and map it in the database.</span>
            <button onClick={handleRevalidate} disabled={isProcessing} className="flex items-center gap-1 text-[var(--color-emerald)] font-semibold hover:underline">
              <RefreshCw className={cn("w-3 h-3", isProcessing && "animate-spin")} /> Re-run validation
            </button>
          </div>

          {/* Table Container */}
          <div className="card">
            <div className="card__body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trade No</th>
                    <th>Date</th>
                    <th>Script</th>
                    <th>BS</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th>Client</th>
                    <th>Terminal</th>
                    <th>Close Out</th>
                    <th>Status</th>
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
                      <td className="text-xs">{row.tradeDate}</td>
                      <td
                        className={cn(
                          'text-xs cursor-pointer select-none transition-colors hover:bg-slate-100/50 p-2 rounded',
                          !row.resolvedScriptId
                            ? 'text-[var(--color-negative)] font-bold hover:underline decoration-red-500'
                            : 'font-semibold'
                        )}
                        onDoubleClick={() => handleScriptDoubleClick(row.scriptShortName, row.scriptFullName, row.exchange)}
                        title={!row.resolvedScriptId ? 'Double-click to create script mapping' : 'Script resolved'}
                      >
                        {row.scriptShortName}
                      </td>
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
                      <td
                        className={cn(
                          'font-mono text-xs cursor-pointer select-none transition-colors hover:bg-slate-100/50 p-2 rounded',
                          !row.resolvedAccountId
                            ? 'text-[var(--color-negative)] font-bold hover:underline decoration-red-500'
                            : ''
                        )}
                        onDoubleClick={() => handleClientDoubleClick(row.clientCode)}
                        title={!row.resolvedAccountId ? 'Double-click to create client' : 'Client resolved'}
                      >
                        {row.clientCode}
                      </td>
                      <td className="text-xs">{row.terminal}</td>
                      <td className="text-xs">{row.expiry}</td>
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

      {/* Auto-Creation Modals */}
      {showClientModal && (
        <FormModal
          entityLabel="Client"
          groupName="Sundry Debtors"
          initialData={clientModalInitialData}
          onClose={() => setShowClientModal(false)}
          onSuccess={() => {
            setShowClientModal(false);
            handleRevalidate();
          }}
        />
      )}

      {showScriptModal && (
        <ScriptFormModal
          initialData={scriptModalInitialData}
          exchanges={exchanges}
          onClose={() => setShowScriptModal(false)}
          onSuccess={() => {
            setShowScriptModal(false);
            handleRevalidate();
          }}
        />
      )}
    </div>
  );
}
