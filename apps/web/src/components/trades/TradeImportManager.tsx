'use client';

import { useState, useEffect, useRef } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, ArrowLeft, Upload, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/utils/cn';
import { parseTradeFile } from '../../lib/tradeParser';
import { FormModal } from '../accounts/FormModal';
import { ScriptFormModal } from '../scripts/ScriptFormModal';
import { useTradeImport } from './TradeImportContext';
import './trades-import.css';

// Helper to convert normalized datetime string (e.g. "2026-04-10 15:11:56") 
// to input datetime-local format "2026-04-10T15:11:56"
function formatDateTimeForInput(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '';
  const cleaned = dateTimeStr.trim();
  if (cleaned.includes('T')) {
    return cleaned;
  }
  return cleaned.replace(' ', 'T');
}

// Helper to convert input datetime-local value (e.g. "2026-04-10T15:11:56")
// back to normalized datetime string "2026-04-10 15:11:56"
function parseDateTimeFromInput(value: string): string {
  if (!value) return '';
  let cleaned = value.trim().replace('T', ' ');
  if (cleaned.length === 16) { // YYYY-MM-DD HH:MM
    cleaned += ':00';
  }
  return cleaned;
}

// Helper to convert different expiry string formats to "YYYY-MM-DD"
// so that the HTML date picker can display it.
function formatExpiryForInput(expiryStr: string | null | undefined): string {
  if (!expiryStr) return '';
  const cleaned = expiryStr.trim();
  if (!cleaned) return '';

  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Check YYYY/MM/DD
  const ymdSlash = cleaned.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymdSlash) {
    return `${ymdSlash[1]}-${ymdSlash[2]}-${ymdSlash[3]}`;
  }

  // Check DD-MMM-YY or DD-MMM-YYYY or DDMMMYY (e.g. 28APR26, 28-APR-26, 28-APR-2026)
  const regex = /^(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2}|\d{4})$/;
  const match = cleaned.match(regex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = match[2].toUpperCase();
    let yearStr = match[3];
    let year = parseInt(yearStr, 10);
    if (yearStr.length === 2) {
      year += 2000;
    }
    
    const months: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };
    if (monthStr in months) {
      return `${year}-${months[monthStr]}-${day}`;
    }
  }

  // Fallback to native Date parsing if possible
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

export function TradeImportManager({ onBack }: { onBack?: () => void }) {
  const {
    step,
    setStep,
    isProcessing,
    setIsProcessing,
    fileName,
    setFileName,
    parsedTrades,
    setParsedTrades,
    normalizedRows,
    setNormalizedRows,
    previewRows,
    setPreviewRows,
    importResult,
    setImportResult,
    selectedExchangeId,
    setSelectedExchangeId,
    selectedBrokerId,
    setSelectedBrokerId,
    selectedImportType,
    setSelectedImportType,
    resetImportState,
  } = useTradeImport();

  const [clients, setClients] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);

  const previewRowsRef = useRef<any[]>([]);

  useEffect(() => {
    previewRowsRef.current = previewRows;
  }, [previewRows]);

  // If the wizard was left in the RESULT state (import finished),
  // reset it on mount so the user starts fresh when visiting again.
  useEffect(() => {
    if (step === 'RESULT') {
      resetImportState();
    }
  }, []);

  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalInitialData, setClientModalInitialData] = useState<any>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptModalInitialData, setScriptModalInitialData] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load exchanges and brokers on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        // 1. Fetch Exchanges
        const exRes = await fetch(`${apiUrl}/exchanges`);
        if (exRes.ok) {
          const exData = await exRes.json();
          setExchanges(exData);
          if (exData.length > 0 && !selectedExchangeId) {
            setSelectedExchangeId(exData[0].id);
          }
        }

        // 2. Fetch Brokers (Sundry Creditors)
        const brRes = await fetch(`${apiUrl}/account-masters?group=Sundry Creditors`);
        if (brRes.ok) {
          const brData = await brRes.json();
          setBrokers(brData);
          if (brData.length > 0 && !selectedBrokerId) {
            setSelectedBrokerId(brData[0].id);
          }
        }

        // 3. Fetch Clients (Sundry Debtors)
        const clRes = await fetch(`${apiUrl}/account-masters?group=Sundry Debtors`);
        if (clRes.ok) {
          const clData = await clRes.json();
          setClients(clData);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        await handleFileRead(content, file.name);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read the file.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleFileRead = async (content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);
    try {
      // ── Phase 1: Instant local parse (runs in ~10-50ms) ──────
      const parseResult = parseTradeFile(content);
      if (parseResult.trades.length === 0) {
        throw new Error('No valid trade rows found in the file structure.');
      }
      setParsedTrades(parseResult.trades);

      // Build an immediate preview from local data so the table renders instantly.
      // Status is 'Validating' until the backend confirms.
      const instantPreview = parseResult.trades.map((t) => ({
        tradeNumber: t.tradeNo,
        clientCode: t.clientCode,
        scriptCode: t.fullScript || t.script,
        scriptShortName: t.script,
        scriptFullName: t.fullScript,
        exchange: '',
        buySell: t.type,
        quantity: t.qty,
        rate: t.rate,
        tradeDate: t.tradeTime,
        status: 'Validating' as const,
        errors: [] as string[],
        terminal: t.terminal,
        expiry: t.expiry,
        orderId: t.orderId,
        exchangeTime: t.exchangeTime,
        uniqueTradeId: t.uniqueTradeId,
        orderTime: t.orderTime,
        instrumentType: t.instrumentType,
      }));

      setPreviewRows(instantPreview);
      setNormalizedRows(instantPreview);
      setStep('PREVIEW');
      toast.success(`Parsed ${parseResult.trades.length} rows. Validating against database…`);

      // ── Phase 2: Background validation (runs async) ──────────
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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
      setNormalizedRows(previewData);
      toast.success('Validation complete.');
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file');
      // If we already moved to PREVIEW, stay there with the local data
      // Otherwise reset
      if (step === 'UPLOAD') {
        setFileName('');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchClients = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const clRes = await fetch(`${apiUrl}/account-masters?group=Sundry Debtors`);
      if (clRes.ok) {
        const clData = await clRes.json();
        setClients(clData);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const triggerRevalidation = async (currentRows: any[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const parsed = currentRows.map((r) => ({
        tradeNo: r.tradeNumber,
        clientCode: r.clientCode,
        script: r.scriptShortName,
        fullScript: r.scriptFullName || r.scriptShortName,
        expiry: r.expiry || '',
        terminal: r.terminal || '',
        type: r.buySell,
        qty: Number(r.quantity),
        rate: Number(r.rate),
        tradeTime: r.tradeDate,
        orderId: r.orderId || '',
        uniqueTradeId: r.uniqueTradeId || '',
        exchangeTime: r.exchangeTime || '',
        orderTime: r.orderTime || '',
        instrumentType: r.instrumentType || '',
      }));

      const previewRes = await fetch(`${apiUrl}/trade-import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed }),
      });

      if (previewRes.ok) {
        const previewData = await previewRes.json();
        setPreviewRows(previewData);
        setNormalizedRows(previewData);
      }
    } catch (err) {
      console.error('Failed to auto-revalidate:', err);
    }
  };

  const handleCellChange = (index: number, field: string, value: any) => {
    setPreviewRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      
      if (field === 'clientCode') {
        const found = clients.find(c => c.code === value);
        copy[index].resolvedAccountId = found ? found.id : undefined;
      }
      if (field === 'scriptShortName') {
        copy[index].scriptFullName = value;
      }
      return copy;
    });

    setNormalizedRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      
      if (field === 'clientCode') {
        const found = clients.find(c => c.code === value);
        copy[index].resolvedAccountId = found ? found.id : undefined;
      }
      if (field === 'scriptShortName') {
        copy[index].scriptFullName = value;
      }
      return copy;
    });
  };

  const handleBlur = () => {
    triggerRevalidation(previewRowsRef.current);
  };

  const handleRevalidate = async () => {
    if (previewRows.length === 0) return;
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const parsed = previewRows.map((r) => ({
        tradeNo: r.tradeNumber,
        clientCode: r.clientCode,
        script: r.scriptShortName,
        fullScript: r.scriptFullName || r.scriptShortName,
        expiry: r.expiry || '',
        terminal: r.terminal || '',
        type: r.buySell,
        qty: Number(r.quantity),
        rate: Number(r.rate),
        tradeTime: r.tradeDate,
        orderId: r.orderId || '',
        uniqueTradeId: r.uniqueTradeId || '',
        exchangeTime: r.exchangeTime || '',
        orderTime: r.orderTime || '',
        instrumentType: r.instrumentType || '',
      }));

      const previewRes = await fetch(`${apiUrl}/trade-import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed }),
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/trade-import/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: normalizedRows,
          brokerId: selectedBrokerId,
          exchangeId: selectedExchangeId,
        }),
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
    if (inputRef.current) inputRef.current.value = '';
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

  // Compute stats and split rows
  const isValidating = previewRows.some((r) => r.status === 'Validating');
  const futureRows = previewRows.filter((r) => r.instrumentType?.toUpperCase().startsWith('FUT'));
  const optionRows = previewRows.filter((r) => !r.instrumentType?.toUpperCase().startsWith('FUT'));

  const totalRows = previewRows.length;
  const validRowsCount = previewRows.filter((r) => r.status === 'Valid').length;
  const validFuturesCount = futureRows.filter((r) => r.status === 'Valid').length;
  const invalidFuturesCount = futureRows.filter((r) => r.status === 'Invalid').length;
  const validatingCount = futureRows.filter((r) => r.status === 'Validating').length;
  const skippedOptionsCount = optionRows.length;

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto space-y-6">
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

        <div className="flex items-center gap-3">
          {onBack && (step === 'UPLOAD' || step === 'RESULT') && (
            <button onClick={() => {
              if (step === 'RESULT') {
                resetImportState();
              }
              onBack();
            }} className="btn btn--secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Trades
            </button>
          )}
          {step === 'PREVIEW' && (
            <>
              <button onClick={handleReset} className="btn btn--secondary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validRowsCount === 0 || isProcessing || isValidating}
                className="btn btn--primary flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Importing…
                  </>
                ) : isValidating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Validating…
                  </>
                ) : (
                  <>
                    Import {validRowsCount} Valid Trades
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Top Selection & Browse Panel (Always Visible) */}
      <div className="card shadow-md border border-[var(--color-border-light)] p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
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

          <div className="form-field">
            <label className="form-label form-label--required">Trade File</label>
            <div className="flex flex-col justify-end">
              <input
                ref={inputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
                className="btn btn--secondary flex items-center gap-2 w-full justify-center h-[38px] text-xs font-semibold border-[var(--color-border)] hover:bg-[var(--color-snow)] transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-[var(--color-primary)]" />
                    {fileName ? 'Change File' : 'Browse File'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {fileName && (
          <div className="text-xs text-[var(--color-slate)] font-semibold mt-4 bg-[var(--color-snow)] px-3 py-1.5 rounded-lg border border-[var(--color-border-light)] w-fit flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Selected File: <span className="text-[var(--color-charcoal)] font-mono">{fileName}</span>
          </div>
        )}
      </div>

      {/* Wizard Steps Content (Rendered Below Dropdowns) */}
      {step === 'UPLOAD' && (
        <div className="max-w-3xl mx-auto py-6">
          <FileUploadZone onFileRead={handleFileRead} isProcessing={isProcessing} />
        </div>
      )}

      {step === 'PREVIEW' && (
        <div className="space-y-6">
          {/* Stats Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Valid Futures</div>
                  <div className="text-lg font-bold text-[var(--color-positive)]">{validFuturesCount}</div>
                </div>
              </div>
            </div>

            <div className="card bg-[var(--color-snow)]">
              <div className="card__body p-4 flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Invalid Futures</div>
                  <div className="text-lg font-bold text-[var(--color-negative)]">{invalidFuturesCount}</div>
                </div>
              </div>
            </div>

            <div className="card bg-[var(--color-snow)]">
              <div className="card__body p-4 flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <AlertTriangle className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <div className="text-xs text-[var(--color-slate)] uppercase font-semibold">Options (Skipped)</div>
                  <div className="text-lg font-bold text-slate-700">{skippedOptionsCount}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-slate)] italic bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <span>💡 Tip: Click inside cells to edit. Click '+Map' or '+Create' on unmapped client/scripts to resolve database records.</span>
            <button onClick={handleRevalidate} disabled={isProcessing} className="flex items-center gap-1 text-[var(--color-emerald)] font-semibold hover:underline">
              <RefreshCw className={cn("w-3 h-3", isProcessing && "animate-spin")} /> Re-run validation
            </button>
          </div>

          {/* Future Trades Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-charcoal)] flex items-center gap-2">
              <span>📈 Future Trades Preview</span>
              <span className="text-xs font-normal bg-emerald-50 text-[var(--color-emerald)] px-2.5 py-0.5 rounded-full font-mono">
                {validFuturesCount} valid / {futureRows.length} total
              </span>
            </h3>
            <div className="card">
              <div className="card__body p-0 overflow-x-auto">
                <table className="data-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '960px' }}>
                  <colgroup>
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '185px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '70px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '70px' }} />
                    <col style={{ width: '125px' }} />
                    <col style={{ width: '45px' }} />
                  </colgroup>
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
                      <th className="text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {futureRows.length === 0 ? (
                      <tr className="trade-empty-row">
                        <td colSpan={10}>No future trades found in the file.</td>
                      </tr>
                    ) : (
                      futureRows.map((row) => {
                        const idx = previewRows.findIndex(
                          (r) => r.tradeNumber === row.tradeNumber && r.uniqueTradeId === row.uniqueTradeId
                        );
                        return (
                          <tr
                            key={row.uniqueTradeId || row.tradeNumber}
                            className={cn(
                              row.status === 'Invalid' ? 'bg-red-50/20' : 'hover:bg-[var(--color-snow)]'
                            )}
                          >
                            <td>
                              <input
                                type="text"
                                className="edit-cell-input font-mono w-tradenum text-xs"
                                value={row.tradeNumber}
                                onChange={(e) => handleCellChange(idx, 'tradeNumber', e.target.value)}
                                onBlur={handleBlur}
                              />
                            </td>
                            <td>
                              <input
                                type="datetime-local"
                                step="1"
                                className="edit-cell-input w-date text-xs"
                                value={formatDateTimeForInput(row.tradeDate)}
                                onChange={(e) => {
                                  const newVal = parseDateTimeFromInput(e.target.value);
                                  handleCellChange(idx, 'tradeDate', newVal);
                                  if (newVal) {
                                    const updated = [...previewRows];
                                    updated[idx] = { ...updated[idx], tradeDate: newVal };
                                    triggerRevalidation(updated);
                                  }
                                }}
                                onBlur={handleBlur}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={cn(
                                  "edit-cell-input font-semibold w-script text-xs cursor-pointer",
                                  !row.resolvedScriptId ? "text-red-600 font-bold decoration-red-500 underline" : "text-[var(--grid-text)]"
                                )}
                                value={row.scriptShortName}
                                onChange={(e) => handleCellChange(idx, 'scriptShortName', e.target.value)}
                                onBlur={handleBlur}
                                onDoubleClick={() => handleScriptDoubleClick(row.scriptShortName, row.scriptFullName || row.scriptShortName, row.exchange)}
                                title={!row.resolvedScriptId ? 'Script not mapped/added. Double-click to map.' : 'Script resolved'}
                              />
                            </td>
                            <td>
                              <select
                                className="edit-cell-select font-semibold text-xs text-center"
                                value={row.buySell}
                                onChange={(e) => {
                                  handleCellChange(idx, 'buySell', e.target.value);
                                  triggerRevalidation(previewRowsRef.current);
                                }}
                              >
                                <option value="BUY">BUY</option>
                                <option value="SELL">SELL</option>
                              </select>
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                className="edit-cell-input text-right font-mono font-semibold w-number text-xs"
                                value={row.quantity}
                                onChange={(e) => handleCellChange(idx, 'quantity', Number(e.target.value))}
                                onBlur={handleBlur}
                              />
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                step="any"
                                className="edit-cell-input text-right font-mono font-semibold w-number text-xs"
                                value={row.rate}
                                onChange={(e) => handleCellChange(idx, 'rate', Number(e.target.value))}
                                onBlur={handleBlur}
                              />
                            </td>
                            <td>
                              <select
                                className={cn(
                                  "edit-cell-select font-mono w-client text-xs cursor-pointer",
                                  !row.resolvedAccountId ? "text-red-600 font-bold" : "text-[var(--grid-text)]"
                                )}
                                value={row.clientCode}
                                onChange={(e) => {
                                  const newCode = e.target.value;
                                  handleCellChange(idx, 'clientCode', newCode);
                                  const found = clients.find(c => c.code === newCode);
                                  if (found) {
                                    handleCellChange(idx, 'resolvedAccountId', found.id);
                                  } else {
                                    handleCellChange(idx, 'resolvedAccountId', undefined);
                                  }
                                  triggerRevalidation(previewRowsRef.current);
                                }}
                                onDoubleClick={() => handleClientDoubleClick(row.clientCode)}
                                title={!row.resolvedAccountId ? 'Client not found. Double-click client to create.' : 'Client resolved'}
                              >
                                <option value="">-- Select Client --</option>
                                {row.clientCode && !clients.some(c => c.code === row.clientCode) && (
                                  <option value={row.clientCode}>{row.clientCode}</option>
                                )}
                                {clients.map(client => (
                                  <option key={client.id} value={client.code}>
                                    {client.code} ({client.name})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="edit-cell-input w-terminal text-xs"
                                value={row.terminal || ''}
                                onChange={(e) => handleCellChange(idx, 'terminal', e.target.value)}
                                onBlur={handleBlur}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="edit-cell-input w-date text-xs"
                                value={formatExpiryForInput(row.expiry)}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  handleCellChange(idx, 'expiry', newVal);
                                  if (newVal) {
                                    const updated = [...previewRows];
                                    updated[idx] = { ...updated[idx], expiry: newVal };
                                    triggerRevalidation(updated);
                                  }
                                }}
                                onBlur={handleBlur}
                              />
                            </td>
                            <td className="text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 text-xs font-semibold cursor-help',
                                  row.status === 'Valid'
                                    ? 'text-[var(--color-positive)]'
                                    : row.status === 'Validating'
                                    ? 'text-blue-500'
                                    : 'text-[var(--color-negative)]'
                                )}
                                title={
                                  row.status === 'Validating'
                                    ? 'Validating against database…'
                                    : row.errors && row.errors.length > 0
                                    ? row.errors.join(', ')
                                    : 'No errors'
                                }
                              >
                                {row.status === 'Valid' ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : row.status === 'Validating' ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4" />
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Option Trades (Excluded) Table */}
          {optionRows.length > 0 && (
            <div className="space-y-3 pt-6">
              <h3 className="text-sm font-bold text-[var(--color-charcoal)] flex items-center gap-2">
                <span>🚫 Excluded Option Trades</span>
                <span className="text-xs font-normal bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono">
                  {optionRows.length} excluded
                </span>
              </h3>
              <div className="card border-slate-200 bg-slate-50/20 opacity-80">
                <div className="card__body p-0 overflow-x-auto">
                  <table className="data-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '960px' }}>
                    <colgroup>
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '185px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '70px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '70px' }} />
                      <col style={{ width: '125px' }} />
                      <col style={{ width: '45px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100/50">
                        <th>Trade No</th>
                        <th>Date</th>
                        <th>Script</th>
                        <th>BS</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Rate</th>
                        <th>Client</th>
                        <th>Terminal</th>
                        <th>Close Out</th>
                        <th className="text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {optionRows.map((row) => (
                        <tr key={row.uniqueTradeId || row.tradeNumber} className="hover:bg-slate-50/50">
                          <td className="font-mono text-xs text-slate-500 px-3 py-2">{row.tradeNumber}</td>
                          <td className="text-xs text-slate-500 px-3 py-2">{row.tradeDate}</td>
                          <td className="text-xs text-slate-500 font-semibold px-3 py-2">{row.scriptShortName}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                              {row.buySell}
                            </span>
                          </td>
                          <td className="text-right font-mono text-xs text-slate-500 px-3 py-2">{row.quantity}</td>
                          <td className="text-right font-mono text-xs text-slate-500 px-3 py-2">₹{row.rate.toFixed(2)}</td>
                          <td className="font-mono text-xs text-slate-500 px-3 py-2">{row.clientCode}</td>
                          <td className="text-xs text-slate-500 px-3 py-2">{row.terminal}</td>
                          <td className="text-xs text-slate-500 px-3 py-2">{row.expiry}</td>
                          <td className="text-center py-2">
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 cursor-help"
                              title={row.errors && row.errors.length > 0 ? row.errors.join(', ') : 'Not a valid future trade'}
                            >
                              <AlertTriangle className="w-4 h-4 text-slate-400" />
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
              <button onClick={handleReset} className="btn btn--secondary flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Another
              </button>
              {onBack && (
                <button onClick={() => {
                  resetImportState();
                  onBack();
                }} className="btn btn--primary flex items-center gap-2">
                  View Trades List
                </button>
              )}
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
          onSuccess={async () => {
            setShowClientModal(false);
            await fetchClients();
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
