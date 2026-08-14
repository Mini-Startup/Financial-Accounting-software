'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OpenPositionVerificationPanel, type PositionVerificationItem } from '../trades/OpenPositionVerificationPanel';
import { generateDubaiSecurityName, cleanScriptFullName } from '../trades/tradeImportHelpers';
import { ScriptFormModal } from '../scripts/ScriptFormModal';
import { ClosingRateDataTable } from './ClosingRateDataTable';
import { ClosingRateFormModal } from './ClosingRateFormModal';
import { 
  Plus, UploadCloud, ArrowLeft, CheckCircle2, AlertTriangle, FileSpreadsheet, 
  RefreshCw, ChevronDown, ChevronUp, PlusCircle 
} from 'lucide-react';
import { 
  parseOpenPositionCSV, 
  processOpenPositionClosingRates, 
  type ParsedClosingRateItem, 
  type OpenPositionParsedRow 
} from '../../lib/tradeParser/openPositionParser';

interface PositionDiscrepancy {
  clientCode: string;
  securityName: string;
  systemNetQty: number;
  csvNetQty: number;
  diff: number;
  reason: string;
}

export function ClosingRatePageManager({ 
  initialClosingRates,
  exchanges,
  scripts,
  currencies = []
}: { 
  initialClosingRates: any[];
  exchanges: any[];
  scripts: any[];
  currencies?: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImportParam = searchParams.get('import') === 'true';

  const [viewMode, setViewMode] = useState<'list' | 'import'>(isImportParam ? 'import' : 'list');
  const [isAdding, setIsAdding] = useState(false);

  // Dynamic reference master data
  const [localScripts, setLocalScripts] = useState<any[]>(scripts);
  const [localCurrencies, setLocalCurrencies] = useState<any[]>(currencies);

  // Script Creation Modal States
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptModalInitialData, setScriptModalInitialData] = useState<any>(null);

  // Sync state with query parameters
  useEffect(() => {
    setViewMode(isImportParam ? 'import' : 'list');
  }, [isImportParam]);

  // Open Position Import states
  const [importDate, setImportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const [rawOpenPositionRows, setRawOpenPositionRows] = useState<OpenPositionParsedRow[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedClosingRateItem[]>([]);
  
  // Accordion state (Closed by default)
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  // Pagination for Accordion Table
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);

  // System settlement trades for date verification
  const [settlementItems, setSettlementItems] = useState<any[]>([]);
  const [isLoadingSettlement, setIsLoadingSettlement] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch settlement trades whenever import date changes
  const fetchSettlementForDate = async (dateStr: string) => {
    if (!dateStr) return;
    setIsLoadingSettlement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setSettlementItems(data);
      } else {
        setSettlementItems([]);
      }
    } catch (err) {
      console.error('Failed to fetch settlement data:', err);
      setSettlementItems([]);
    } finally {
      setIsLoadingSettlement(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'import' && importDate) {
      fetchSettlementForDate(importDate);
    }
  }, [viewMode, importDate]);

  const handleImportBack = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('import');
    window.history.pushState({}, '', url.toString());
    setViewMode('list');
    router.refresh();
  };

  // Fetch currencies if not loaded
  useEffect(() => {
    if (localCurrencies.length === 0) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/currencies`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (data.length > 0) setLocalCurrencies(data);
        })
        .catch((err) => console.error('Failed to load currencies:', err));
    }
  }, [localCurrencies.length]);

  const handleOpenScriptModal = (commodityCode: string, securityName?: string, exchangeCode?: string) => {
    let foundExchange = exchanges.find(
      (ex) => ex.code.toUpperCase() === (exchangeCode || '').toUpperCase()
    );
    const cleanedFullName = securityName ? cleanScriptFullName(securityName) : commodityCode;

    setScriptModalInitialData({
      shortName: commodityCode.toUpperCase(),
      fullName: cleanedFullName,
      lotSize: 1,
      exchangeId: foundExchange ? foundExchange.id : (exchanges[0]?.id || ''),
      currencyId: (localCurrencies[0]?.id || ''),
    });
    setShowScriptModal(true);
  };

  const handleScriptCreated = async () => {
    setShowScriptModal(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`);
      if (res.ok) {
        const updatedScripts = await res.json();
        setLocalScripts(updatedScripts);
        if (rawOpenPositionRows.length > 0) {
          const reprocessed = processOpenPositionClosingRates(rawOpenPositionRows, exchanges, updatedScripts);
          setParsedItems(reprocessed);
        }
        toast.success('Script created! Open position verification re-evaluated.');
      }
    } catch (err) {
      console.error('Failed to reload scripts:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const rawRows = parseOpenPositionCSV(text);
        if (rawRows.length === 0) {
          toast.error('No valid rows found in CSV file.');
          setIsProcessing(false);
          return;
        }

        setRawOpenPositionRows(rawRows);
        const items = processOpenPositionClosingRates(rawRows, exchanges, localScripts);
        setParsedItems(items);
        toast.success(`Successfully extracted ${items.length} unique closing rates from ${rawRows.length} open position rows`);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to parse open position CSV file.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // Perform Open Position Verification against system settlement trades
  const performVerification = () => {
    if (rawOpenPositionRows.length === 0) {
      return { status: 'NO_FILE' as const, discrepancies: [] };
    }

    // 1. Group CSV open net lots by ClientCode + SecurityName (constructed using full script name)
    const csvClientMap = new Map<string, {
      netLots: number;
      isScriptMissing: boolean;
      commodityCode: string;
      exchangeCode: string;
      securityName: string;
    }>();

    for (const row of rawOpenPositionRows) {
      const clientCode = row.clientCode.trim().toUpperCase();
      if (!clientCode) continue;

      const scriptObj = localScripts.find(
        (s) => (s.shortName && s.shortName.toUpperCase() === row.commodityCode.toUpperCase()) ||
               (s.fullName && s.fullName.toUpperCase() === row.commodityCode.toUpperCase())
      );

      const baseName = scriptObj?.fullName || scriptObj?.shortName || row.commodityCode;
      
      const secName = (
        generateDubaiSecurityName(
          {
            delMonth: row.delMonth,
            expiryDate: row.expiryDate,
            callPut: row.callPut,
            strikePrice: row.strikePrice,
            rawCallPut: row.callPut,
          } as any,
          scriptObj || { fullName: baseName, shortName: baseName }
        ) || `${baseName} ${row.expiryDate || row.delMonth}`.trim()
      ).toUpperCase();

      const bought = parseFloat(row.rawRow['BOUGHT_LOTS'] || '0') || 0;
      const sold = parseFloat(row.rawRow['SOLD_LOTS'] || '0') || 0;
      const netLotsFromCols = bought - sold;
      const netLotsFromCol = parseFloat(row.rawRow['NET_LOTS'] || '0');
      const netLots = !isNaN(netLotsFromCol) && netLotsFromCol !== 0 ? netLotsFromCol : netLotsFromCols;

      const key = `${clientCode}_${secName}`;
      const existing = csvClientMap.get(key);
      if (existing) {
        existing.netLots += netLots;
        if (!scriptObj) existing.isScriptMissing = true;
      } else {
        csvClientMap.set(key, {
          netLots,
          isScriptMissing: !scriptObj,
          commodityCode: row.commodityCode,
          exchangeCode: row.exchange,
          securityName: secName,
        });
      }
    }

    // 2. Map System Client open positions
    const systemClientMap = new Map<string, { item: any; netQty: number }>();
    const clientSummaryItems = settlementItems.filter((i) => i.role === 'CLIENT' && i.netQty !== 0);

    for (const item of clientSummaryItems) {
      const key = `${item.accountCode.trim().toUpperCase()}_${item.securityName.trim().toUpperCase()}`;
      systemClientMap.set(key, { item, netQty: item.netQty });
    }

    // 3. Compare All Positions (Valid + Discrepancies)
    const items: PositionVerificationItem[] = [];
    const allKeys = new Set([...Array.from(csvClientMap.keys()), ...Array.from(systemClientMap.keys())]);

    for (const key of Array.from(allKeys)) {
      const csvData = csvClientMap.get(key);
      const csvQty = csvData ? csvData.netLots : 0;
      const sysObj = systemClientMap.get(key);
      const sysQty = sysObj ? sysObj.netQty : 0;
      const diff = sysQty - csvQty;
      const isQtyMatched = Math.abs(diff) <= 0.001;
      const isUnmapped = !!csvData?.isScriptMissing;
      
      // Even if quantity matches, if script is unmapped in DB, position is INVALID / UNMAPPED!
      const isValid = isQtyMatched && !isUnmapped;

      const parts = key.split('_');
      const clientCode = parts[0];
      const securityName = parts.slice(1).join('_');

      let reason = 'Matched';
      if (isUnmapped) {
        reason = `Script '${csvData?.commodityCode}' not found in database. Please create script.`;
      } else if (!isQtyMatched) {
        reason = sysQty === 0
          ? 'Position present in CSV but missing in system trades'
          : csvQty === 0
          ? 'Position present in system trades but missing in CSV'
          : 'Open quantity mismatch between system and CSV';
      }

      items.push({
        clientCode,
        securityName,
        commodityCode: csvData?.commodityCode,
        exchangeCode: csvData?.exchangeCode,
        systemNetQty: sysQty,
        csvNetQty: csvQty,
        diff,
        isValid,
        isUnmappedScript: isUnmapped,
        reason,
      });
    }

    const discrepancies = items.filter((i) => !i.isValid);
    const isValidated = discrepancies.length === 0;

    return {
      status: isValidated ? ('VALIDATED' as const) : ('FAILED' as const),
      items,
      discrepancies,
    };
  };

  const verification = performVerification();
  const isValidated = verification.status === 'VALIDATED';

  // Handle Add or Adjust Trades button
  const handleAddAdjustTrades = async () => {
    if (!isValidated) {
      toast.error('Open Position validation must pass before adding or adjusting trades.');
      return;
    }

    const openPositions = settlementItems.filter((i) => i.netQty !== 0);
    if (openPositions.length === 0) {
      toast.error('No open positions available to adjust.');
      return;
    }

    if (!confirm(`Are you sure you want to add Carry Forward and Back Forward trades for ${openPositions.length} open positions on ${importDate}?`)) {
      return;
    }

    setIsAdjusting(true);
    try {
      const adjustments = openPositions.map((item) => ({
        accountId: item.accountId,
        scriptId: item.scriptId,
        exchangeId: item.exchangeId,
        netQty: item.netQty,
        closingRate: item.closingRate ?? 0,
        securityName: item.securityName,
        expiry: item.expiry,
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/adjust-trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate: importDate,
          adjustments,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create adjustment trades');
      }

      const result = await res.json();
      toast.success(`Successfully added ${result.createdCount} Carry Forward & Back Forward trades!`);
      
      // Refresh settlement data
      await fetchSettlementForDate(importDate);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error executing trade adjustments');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleConfirmImport = async () => {
    const validItems = parsedItems.filter(
      (item) => item.status === 'Valid' && item.resolvedExchangeId && item.resolvedScriptId
    );
    if (validItems.length === 0) {
      toast.error('No valid mapped scripts available to import. Please add or map scripts in the database first.');
      return;
    }

    if (!importDate) {
      toast.error('Please select an import date.');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        rates: validItems.map((item) => {
          const scriptObj = localScripts.find((s) => s.id === item.resolvedScriptId);
          const scriptCurrency = scriptObj?.currency?.code || item.currencyCode || 'USD';

          return {
            exchangeId: item.resolvedExchangeId,
            scriptId: item.resolvedScriptId || null,
            securityName: item.securityName || item.scriptFullName || item.commodityCode,
            rateDate: importDate,
            rate: item.closingPrice,
            expiry: item.expiryDate || null,
            delMonth: item.delMonth || null,
            callPut: item.callPut || null,
            strikePrice: item.strikePrice ? parseFloat(item.strikePrice) : null,
            currencyCode: scriptCurrency,
          };
        }),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Bulk import failed');
      }

      const result = await res.json();
      toast.success(`Successfully imported ${result.importedCount} closing rates for ${importDate}!`);
      handleImportBack();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error saving closing rates to database.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (viewMode === 'import') {
    const validCount = parsedItems.filter((i) => i.status === 'Valid').length;
    const unmappedCount = parsedItems.filter((i) => i.status === 'Unmapped').length;

    // Accordion pagination math
    const totalTablePages = Math.max(1, Math.ceil(parsedItems.length / tablePageSize));
    const safeTablePage = Math.min(tablePage, totalTablePages);
    const paginatedItems = parsedItems.slice(
      (safeTablePage - 1) * tablePageSize,
      safeTablePage * tablePageSize
    );

    return (
      <div className="space-y-6">
        {/* Import Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleImportBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800"
              title="Back to Closing Rates"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-h2 font-display">Open Position Import (Closing Rates)</h1>
              <p className="text-sm text-[var(--color-slate)] mt-1">
                Upload your daily Open Position CSV file to extract closing rates and verify position settlement.
              </p>
            </div>
          </div>

          {parsedItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  setParsedItems([]);
                  setRawOpenPositionRows([]);
                  setFileName('');
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="btn btn--secondary py-2 text-xs"
              >
                Reset File
              </button>

              {/* Add / Adjust Trades Button */}
              <button
                onClick={handleAddAdjustTrades}
                disabled={!isValidated || isAdjusting}
                className={`btn flex items-center gap-2 py-2 px-4 text-xs font-bold transition-all ${
                  isValidated && !isAdjusting
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
                title={!isValidated ? 'Open Position validation must pass to enable Add / Adjust Trades' : 'Create Carry & Back Forward trades'}
              >
                {isAdjusting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Adjusting Trades…
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> Add / Adjust Trades
                  </>
                )}
              </button>

              {/* Import Closing Rates Button */}
              <button
                onClick={handleConfirmImport}
                disabled={isProcessing || validCount === 0}
                className="btn btn--primary flex items-center gap-2 py-2 text-xs font-bold"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>Import {validCount} Closing Rates</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Configuration Card */}
        <div className="card p-6 bg-white border border-[var(--color-border-light)] shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            {/* Date Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Import Rate Date <span className="text-rose-500">*</span>
              </label>
              <input 
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                className="input w-full text-slate-900"
                required
              />
              <p className="text-xs text-slate-400">Closing rates extracted from this file will be saved under this date.</p>
            </div>

            {/* File Upload Button */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Open Position CSV File <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-3">
                <input 
                  type="file"
                  ref={inputRef}
                  onChange={handleFileChange}
                  accept=".csv, .txt"
                  className="hidden"
                  id="open-position-file-input"
                />
                <label 
                  htmlFor="open-position-file-input"
                  className="btn btn--secondary flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="truncate">{fileName ? `File: ${fileName}` : 'Browse Open Position CSV'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Validation Status Bar */}
          {parsedItems.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Validation Status:</span>
                {verification.status === 'VALIDATED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Open Position Verified
                  </span>
                ) : verification.status === 'FAILED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Open Position Not Validated ({verification.discrepancies.length} mismatches)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    No Trades Found for {importDate}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Open Position Verification Panel with Search & Filters */}
          {verification.items && verification.items.length > 0 && (
            <OpenPositionVerificationPanel
              items={verification.items}
              isValidated={isValidated}
              onAddScript={handleOpenScriptModal}
            />
          )}

          {/* Parsed Metrics Summary */}
          {parsedItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="card bg-slate-50 p-4 border border-slate-200">
                <div className="text-xs text-slate-500 font-semibold uppercase">Total Unique Closing Rates</div>
                <div className="text-xl font-bold text-slate-800 mt-1">{parsedItems.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">from {rawOpenPositionRows.length} open position rows</div>
              </div>
              <div className="card bg-emerald-50/60 p-4 border border-emerald-200">
                <div className="text-xs text-emerald-700 font-semibold uppercase">Valid Unique Rates</div>
                <div className="text-xl font-bold text-emerald-800 mt-1">{validCount}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">ready for database import</div>
              </div>
              <div className="card bg-rose-50/60 p-4 border border-rose-200">
                <div className="text-xs text-rose-700 font-semibold uppercase">Unmapped Securities</div>
                <div className="text-xl font-bold text-rose-800 mt-1">{unmappedCount}</div>
                <div className="text-[11px] text-rose-600 mt-0.5">require script creation</div>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Accordion Preview Table (Closed by Default) */}
        {parsedItems.length > 0 && (
          <div className="card shadow-sm border border-slate-200 overflow-hidden">
            {/* Accordion Toggle Header */}
            <button
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Closing Rates Extracted from File ({fileName}) — {parsedItems.length} unique security closing rates</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span>{isAccordionOpen ? 'Hide File Preview' : 'View File Preview'}</span>
                {isAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Accordion Body */}
            {isAccordionOpen && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Exchange</th>
                        <th className="py-3 px-4">Commodity Code</th>
                        <th className="py-3 px-4">Script Full Name</th>
                        <th className="py-3 px-4">Security Name</th>
                        <th className="py-3 px-4">Expiry / DelMonth</th>
                        <th className="py-3 px-4 text-right font-bold">Closing Rate</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {(safeTablePage - 1) * tablePageSize + idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{item.exchangeCode}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-blue-700">{item.commodityCode}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{item.scriptFullName || '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-800 font-bold">{item.securityName}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{item.delMonth || item.expiryDate || '—'}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {item.currencySymbol || '$'}{item.closingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.status === 'Valid' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenScriptModal(item.commodityCode, item.securityName, item.exchangeCode)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors"
                                title={item.errors.join(', ') + ' - Click to add this script'}
                              >
                                <Plus className="w-3 h-3 text-rose-600" />
                                <span>Unmapped (Add)</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border-t border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Rows per page:</span>
                    <select
                      value={tablePageSize}
                      onChange={(e) => {
                        setTablePageSize(Number(e.target.value));
                        setTablePage(1);
                      }}
                      className="input py-1 px-2 text-xs w-[70px]"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">
                      Page {safeTablePage} of {totalTablePages} ({parsedItems.length} items)
                    </span>
                    <div className="flex gap-1">
                      <button
                        disabled={safeTablePage === 1}
                        onClick={() => setTablePage((prev) => Math.max(prev - 1, 1))}
                        className="btn btn--secondary py-1 px-2 text-xs disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        disabled={safeTablePage === totalTablePages}
                        onClick={() => setTablePage((prev) => Math.min(prev + 1, totalTablePages))}
                        className="btn btn--secondary py-1 px-2 text-xs disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showScriptModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <ScriptFormModal
              initialData={scriptModalInitialData}
              exchanges={exchanges}
              currencies={localCurrencies}
              onClose={() => setShowScriptModal(false)}
              onSuccess={handleScriptCreated}
            />,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6">
        <div>
          <h1 className="text-h2 font-display">Closing Rates</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Manage daily closing rates used for calculating portfolios, profit/loss, and account balances.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Closing Rate
          </button>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('import', 'true');
              window.history.pushState({}, '', url.toString());
              setViewMode('import');
            }}
            className="btn btn--secondary flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-[var(--color-primary)]" /> Open Position Import
          </button>
        </div>
      </div>

      <ClosingRateDataTable 
        closingRates={initialClosingRates} 
        exchanges={exchanges} 
        scripts={localScripts} 
      />

      {isAdding && (
        <ClosingRateFormModal 
          exchanges={exchanges}
          scripts={localScripts}
          onClose={() => setIsAdding(false)} 
        />
      )}

      {showScriptModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <ScriptFormModal
            initialData={scriptModalInitialData}
            exchanges={exchanges}
            currencies={localCurrencies}
            onClose={() => setShowScriptModal(false)}
            onSuccess={handleScriptCreated}
          />,
          document.body
        )}
    </div>
  );
}
