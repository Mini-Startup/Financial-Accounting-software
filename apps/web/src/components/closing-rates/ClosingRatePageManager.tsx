'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OpenPositionVerificationPanel, type PositionVerificationItem } from '../trades/OpenPositionVerificationPanel';
import { generateDubaiSecurityName, cleanScriptFullName } from '../trades/tradeImportHelpers';
import { ScriptFormModal } from '../scripts/ScriptFormModal';
import { FormModal as AccountFormModal } from '../accounts/FormModal';
import { ClosingRateDataTable } from './ClosingRateDataTable';
import { ClosingRateFormModal } from './ClosingRateFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import { UniversalFileUploader } from '@/components/ui/UniversalFileUploader';
import { UniversalDropdown } from '@/components/ui/UniversalDropdown';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { FindAndReplace, type FindAndReplaceColumn } from '@/components/ui/FindAndReplace';
import { 
  Plus, UploadCloud, ArrowLeft, CheckCircle2, AlertTriangle, FileSpreadsheet, 
  RefreshCw, ChevronDown, ChevronUp, PlusCircle, AlertCircle, X, ShieldAlert, Replace, Search
} from 'lucide-react';
import { 
  parseOpenPositionCSV, 
  processOpenPositionClosingRates, 
  type ParsedClosingRateItem, 
  type OpenPositionParsedRow 
} from '../../lib/tradeParser/openPositionParser';


export function ClosingRatePageManager({ 
  initialClosingRates,
  exchanges,
  scripts,
  currencies = [],
  accounts = [],
}: { 
  initialClosingRates: any[];
  exchanges: any[];
  scripts: any[];
  currencies?: any[];
  accounts?: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImportParam = searchParams.get('import') === 'true';

  const [viewMode, setViewMode] = useState<'list' | 'import'>(isImportParam ? 'import' : 'list');
  const [isAdding, setIsAdding] = useState(false);

  // Dynamic reference master data
  const [localScripts, setLocalScripts] = useState<any[]>(scripts);
  const [localCurrencies, setLocalCurrencies] = useState<any[]>(currencies);
  const [localAccounts, setLocalAccounts] = useState<any[]>(accounts);

  // Script Creation Modal States
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptModalInitialData, setScriptModalInitialData] = useState<any>(null);

  // Client Creation Modal States
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalInitialData, setClientModalInitialData] = useState<any>(null);

  // Sync state with query parameters
  useEffect(() => {
    setViewMode(isImportParam ? 'import' : 'list');
  }, [isImportParam]);

  // Open Position Import states
  const [importDate, setImportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const [showAdjustConfirm, setShowAdjustConfirm] = useState<boolean>(false);
  const [rawOpenPositionRows, setRawOpenPositionRows] = useState<OpenPositionParsedRow[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedClosingRateItem[]>([]);
  
  // Preview Selection & Search States
  const [selectedRateIndices, setSelectedRateIndices] = useState<Set<number>>(new Set());
  const [previewSearchQuery, setPreviewSearchQuery] = useState('');
  const [previewSearchColumn, setPreviewSearchColumn] = useState('ALL');
  const [showPreviewFindAndReplace, setShowPreviewFindAndReplace] = useState(false);

  // Sync selectedRateIndices whenever parsedItems changes (default all Valid selected)
  useEffect(() => {
    const init = new Set<number>();
    parsedItems.forEach((item, idx) => {
      if (item.status === 'Valid') init.add(idx);
    });
    setSelectedRateIndices(init);
  }, [parsedItems]);

  // Accordion state (Closed by default)
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  // Pagination for Accordion Table
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);

  // System settlement trades for date verification
  const [settlementItems, setSettlementItems] = useState<any[]>([]);

  // Duplicate Check Modal state
  const [duplicateCheckModal, setDuplicateCheckModal] = useState<{
    isOpen: boolean;
    newRates: any[];
    exactDuplicates: any[];
    conflicts: any[];
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [_isLoadingSettlement, setIsLoadingSettlement] = useState(false);

  // Fetch accounts if not loaded
  useEffect(() => {
    if (localAccounts.length === 0) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (data.length > 0) setLocalAccounts(data);
        })
        .catch((err) => console.error('Failed to load accounts:', err));
    }
  }, [localAccounts.length]);

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
    const foundExchange = exchanges.find(
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

  const handleOpenClientModal = (clientCode: string) => {
    setClientModalInitialData({
      code: clientCode.toUpperCase(),
      name: clientCode.toUpperCase(),
    });
    setShowClientModal(true);
  };

  const handleClientCreated = async () => {
    setShowClientModal(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`);
      if (res.ok) {
        const updatedAccounts = await res.json();
        setLocalAccounts(updatedAccounts);
        toast.success('Client created! Open position verification re-evaluated.');
      }
    } catch (err) {
      console.error('Failed to reload accounts:', err);
    }
  };

  const handleFileSelect = (file: File) => {
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

  const handleClearFile = () => {
    setFileName('');
    setRawOpenPositionRows([]);
    setParsedItems([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Perform Open Position Verification against system settlement trades
  const performVerification = (): {
    status: 'NO_FILE' | 'VALIDATED' | 'FAILED';
    items: PositionVerificationItem[];
    discrepancies: PositionVerificationItem[];
  } => {
    if (rawOpenPositionRows.length === 0) {
      return { status: 'NO_FILE', items: [], discrepancies: [] };
    }

    // 1. Group CSV open net lots by ClientCode + SecurityName (constructed using full script name)
    const csvClientMap = new Map<string, {
      netLots: number;
      isScriptMissing: boolean;
      isClientMissing: boolean;
      commodityCode: string;
      exchangeCode: string;
      securityName: string;
      clientCode: string;
    }>();

    for (const row of rawOpenPositionRows) {
      const clientCode = row.clientCode.trim().toUpperCase();
      if (!clientCode) continue;

      const bought = parseFloat(row.rawRow['BOUGHT_LOTS'] || '0') || 0;
      const sold = parseFloat(row.rawRow['SOLD_LOTS'] || '0') || 0;
      const netLotsFromCols = bought - sold;
      const netLotsFromCol = parseFloat(row.rawRow['NET_LOTS'] || '0');
      const netLots = !isNaN(netLotsFromCol) && netLotsFromCol !== 0 ? netLotsFromCol : netLotsFromCols;

      // Skip inactive rows where net lots is 0 and no bought/sold trades exist
      if (netLots === 0 && bought === 0 && sold === 0) continue;

      const scriptObj = localScripts.find(
        (s) => (s.shortName && s.shortName.toUpperCase() === row.commodityCode.toUpperCase()) ||
               (s.fullName && s.fullName.toUpperCase() === row.commodityCode.toUpperCase())
      );

      const clientObj = localAccounts.find(
        (a) => (a.code && a.code.trim().toUpperCase() === clientCode)
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

      const key = `${clientCode}_${secName}`;
      const existing = csvClientMap.get(key);
      if (existing) {
        existing.netLots += netLots;
        if (!scriptObj) existing.isScriptMissing = true;
        if (!clientObj) existing.isClientMissing = true;
      } else {
        csvClientMap.set(key, {
          netLots,
          isScriptMissing: !scriptObj,
          isClientMissing: !clientObj,
          commodityCode: row.commodityCode,
          exchangeCode: row.exchange,
          securityName: secName,
          clientCode,
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

      // Skip entries where both system and CSV have 0 open positions
      if (csvQty === 0 && sysQty === 0) continue;

      const diff = sysQty - csvQty;
      const isQtyMatched = Math.abs(diff) <= 0.001;

      const parts = key.split('_');
      const clientCode = parts[0];
      const securityName = parts.slice(1).join('_');

      // Check script in DB
      const isUnmappedScript = !!csvData?.isScriptMissing;

      // Position is valid if quantity matches and script exists in DB (client validation not required)
      const isValid = isQtyMatched && !isUnmappedScript;

      let reason = 'Matched';
      if (isUnmappedScript) {
        reason = `Script '${csvData?.commodityCode}' not found in database. Please create script.`;
      } else if (!isQtyMatched) {
        reason = sysQty === 0
          ? `Position present in CSV (Qty: ${csvQty}) but missing in system trades (Qty: 0)`
          : csvQty === 0
          ? `Position present in system trades (Qty: ${sysQty}) but missing in CSV (Qty: 0)`
          : `Open quantity mismatch: System (${sysQty}) vs CSV (${csvQty})`;
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
        isUnmappedScript,
        isUnmappedClient: false,
        reason,
      });
    }

    const discrepancies = items.filter((i) => !i.isValid);
    const isValidated = discrepancies.length === 0 && items.length > 0;

    return {
      status: isValidated ? ('VALIDATED' as const) : ('FAILED' as const),
      items,
      discrepancies,
    };
  };

  const verification = performVerification();
  const isValidated = verification.status === 'VALIDATED';

  // Handle Add or Adjust Trades button
  const handleAddAdjustTrades = () => {
    if (!isValidated) {
      toast.error('Open Position validation must pass before adding or adjusting trades.');
      return;
    }

    const openPositions = settlementItems.filter((i) => i.netQty !== 0);
    if (openPositions.length === 0) {
      toast.error('No open positions available to adjust.');
      return;
    }

    setShowAdjustConfirm(true);
  };

  const executeAdjustTrades = async () => {
    const openPositions = settlementItems.filter((i) => i.netQty !== 0);
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
      setShowAdjustConfirm(false);
      
      // Refresh settlement data
      await fetchSettlementForDate(importDate);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error executing trade adjustments');
    } finally {
      setIsAdjusting(false);
    }
  };

  const executeImport = async (ratesToImport: any[]) => {
    if (!ratesToImport || ratesToImport.length === 0) {
      toast.error('No rates to import.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: ratesToImport }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Bulk import failed');
      }

      const result = await res.json();
      toast.success(`Successfully imported ${result.importedCount} closing rates for ${importDate}!`);
      setDuplicateCheckModal(null);
      handleImportBack();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error saving closing rates to database.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    const validItems = parsedItems.filter(
      (item, idx) => selectedRateIndices.has(idx) && item.status === 'Valid' && item.resolvedExchangeId && item.resolvedScriptId
    );
    if (validItems.length === 0) {
      toast.error('No selected valid mapped scripts available to import. Please select at least one valid script.');
      return;
    }

    if (!importDate) {
      toast.error('Please select an import date.');
      return;
    }

    setIsProcessing(true);
    try {
      const payloadRates = validItems.map((item) => {
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
      });

      // 1. Run duplicate & conflict check first
      const checkRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates/check-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: payloadRates }),
      });

      if (!checkRes.ok) {
        throw new Error('Failed to verify duplicate closing rates.');
      }

      const checkData = await checkRes.json();
      const { newRates = [], exactDuplicates = [], conflicts = [] } = checkData;

      if (conflicts.length > 0 || exactDuplicates.length > 0) {
        setDuplicateCheckModal({
          isOpen: true,
          newRates,
          exactDuplicates,
          conflicts,
        });
      } else {
        // All are new rates, proceed directly
        await executeImport(payloadRates);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error verifying closing rates.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (viewMode === 'import') {
    const validCount = parsedItems.filter((i) => i.status === 'Valid').length;
    const selectedValidCount = parsedItems.filter((i, idx) => selectedRateIndices.has(idx) && i.status === 'Valid').length;
    const unmappedCount = parsedItems.filter((i) => i.status === 'Unmapped').length;

    // Filter parsed items based on preview search
    const filteredParsedItems = parsedItems.filter((item) => {
      if (!previewSearchQuery.trim()) return true;
      const q = previewSearchQuery.toLowerCase().trim();
      if (previewSearchColumn === 'exchangeCode') return (item.exchangeCode || '').toLowerCase().includes(q);
      if (previewSearchColumn === 'commodityCode') return (item.commodityCode || '').toLowerCase().includes(q);
      if (previewSearchColumn === 'scriptFullName') return (item.scriptFullName || '').toLowerCase().includes(q);
      if (previewSearchColumn === 'securityName') return (item.securityName || '').toLowerCase().includes(q);
      if (previewSearchColumn === 'delMonth') return (item.delMonth || item.expiryDate || '').toLowerCase().includes(q);
      return (
        (item.exchangeCode || '').toLowerCase().includes(q) ||
        (item.commodityCode || '').toLowerCase().includes(q) ||
        (item.scriptFullName || '').toLowerCase().includes(q) ||
        (item.securityName || '').toLowerCase().includes(q) ||
        (item.delMonth || item.expiryDate || '').toLowerCase().includes(q) ||
        String(item.closingPrice).includes(q)
      );
    });

    // Accordion pagination math
    const totalTablePages = Math.max(1, Math.ceil(filteredParsedItems.length / tablePageSize));
    const safeTablePage = Math.min(tablePage, totalTablePages);
    const paginatedItems = filteredParsedItems.slice(
      (safeTablePage - 1) * tablePageSize,
      safeTablePage * tablePageSize
    );

    const findAndReplaceColumns: FindAndReplaceColumn[] = [
      { key: 'exchangeCode', label: 'Exchange' },
      { key: 'commodityCode', label: 'Commodity Code' },
      { key: 'scriptFullName', label: 'Script Full Name' },
      { key: 'securityName', label: 'Security Name' },
      { key: 'delMonth', label: 'Expiry / DelMonth' },
      { key: 'closingPrice', label: 'Closing Price' },
    ];

    const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
      setParsedItems((prev) => {
        const copy = [...prev];
        if (copy[rowIndex]) {
          copy[rowIndex] = { ...copy[rowIndex], [columnKey]: columnKey === 'closingPrice' ? parseFloat(newValue) || 0 : newValue };
        }
        return copy;
      });
    };

    const handleReplaceAll = (columnKey: string, findValue: string, replaceValue: string) => {
      if (!findValue) return;
      setParsedItems((prev) =>
        prev.map((item) => {
          const current = String((item as any)[columnKey] || '');
          if (current.toLowerCase().includes(findValue.toLowerCase())) {
            const escaped = findValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'gi');
            const updated = current.replace(regex, replaceValue);
            return { ...item, [columnKey]: columnKey === 'closingPrice' ? parseFloat(updated) || 0 : updated };
          }
          return item;
        })
      );
      toast.success(`Replaced all occurrences in ${columnKey}`);
    };

    const validIndicesInFiltered = filteredParsedItems
      .map((item) => parsedItems.indexOf(item))
      .filter((idx) => idx !== -1 && parsedItems[idx]?.status === 'Valid');

    const isAllFilteredValidSelected =
      validIndicesInFiltered.length > 0 &&
      validIndicesInFiltered.every((idx) => selectedRateIndices.has(idx));

    const handleToggleSelectAllValid = () => {
      setSelectedRateIndices((prev) => {
        const next = new Set(prev);
        if (isAllFilteredValidSelected) {
          validIndicesInFiltered.forEach((idx) => next.delete(idx));
        } else {
          validIndicesInFiltered.forEach((idx) => next.add(idx));
        }
        return next;
      });
    };

    const handleSelectAllValidOverall = () => {
      const allValid = new Set<number>();
      parsedItems.forEach((item, idx) => {
        if (item.status === 'Valid') allValid.add(idx);
      });
      setSelectedRateIndices(allValid);
    };

    const handleDeselectAll = () => {
      setSelectedRateIndices(new Set());
    };

    const handleToggleRow = (globalIdx: number) => {
      setSelectedRateIndices((prev) => {
        const next = new Set(prev);
        if (next.has(globalIdx)) next.delete(globalIdx);
        else next.add(globalIdx);
        return next;
      });
    };

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
                disabled={isProcessing || selectedValidCount === 0}
                className="btn btn--primary flex items-center gap-2 py-2 text-xs font-bold"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>Import {selectedValidCount} Selected Rates</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Configuration Card */}
        <div className="card p-6 bg-white border border-[var(--color-border-light)] shadow-sm space-y-6">
          {/* Top Section: Date Selection */}
          <div className="max-w-md space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Import Rate Date <span className="text-rose-500">*</span>
            </label>
            <UniversalDatePicker
              value={importDate}
              onChange={(d) => setImportDate(d)}
              placeholder="DD-MM-YY"
            />
            <p className="text-xs text-slate-400">Closing rates extracted from this file will be saved under this date.</p>
          </div>

          {/* Bottom Section: File Upload Component */}
          <div className="pt-5 border-t border-[var(--color-border-light)] space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Open Position CSV File <span className="text-rose-500">*</span>
            </label>
            <UniversalFileUploader
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              fileName={fileName}
              isProcessing={isProcessing}
              accept=".csv, .txt"
              title="Select or drop Open Position CSV"
              description="Supports CSV, TXT files (drag & drop or click to browse)"
            />
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
              onAddClient={handleOpenClientModal}
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
              <div className="space-y-3 p-4">
                {/* Preview Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3 flex-wrap flex-1">
                    {/* Column-targeted Search */}
                    <div className="flex items-center bg-white border border-[var(--color-border-medium)] rounded-lg shadow-2xs hover:border-[var(--color-border-focus)] focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-leaf)]/15 transition-all max-w-md w-full">
                      <div className="w-[140px] shrink-0 border-r border-[var(--color-border-light)]">
                        <UniversalDropdown
                          value={previewSearchColumn}
                          onChange={(val) => setPreviewSearchColumn(val)}
                          searchable={false}
                          options={[
                            { value: 'ALL', label: 'All Columns' },
                            { value: 'exchangeCode', label: 'Exchange' },
                            { value: 'commodityCode', label: 'Commodity Code' },
                            { value: 'scriptFullName', label: 'Script Name' },
                            { value: 'securityName', label: 'Security Name' },
                            { value: 'delMonth', label: 'Del Month' },
                          ]}
                          triggerClassName="min-h-[34px] h-[34px] rounded-none rounded-l-lg border-0 bg-slate-50/70 hover:bg-slate-100 shadow-none px-2 text-[11px] font-semibold text-[var(--color-charcoal)]"
                        />
                      </div>
                      <div className="relative flex-1 flex items-center">
                        <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
                        <input
                          type="text"
                          value={previewSearchQuery}
                          onChange={(e) => {
                            setPreviewSearchQuery(e.target.value);
                            setTablePage(1);
                          }}
                          placeholder="Search in preview..."
                          className="w-full h-8.5 px-2.5 text-xs bg-transparent text-slate-800 placeholder:text-slate-400 outline-none"
                        />
                        {previewSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewSearchQuery('');
                              setTablePage(1);
                            }}
                            className="p-1 mr-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Batch Selection Counters */}
                    <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <strong>{selectedValidCount}</strong> of {validCount} valid rates selected
                    </span>

                    <button
                      type="button"
                      onClick={handleSelectAllValidOverall}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Select All Valid
                    </button>

                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPreviewFindAndReplace(!showPreviewFindAndReplace)}
                    className={`btn btn--secondary text-xs flex items-center gap-1.5 py-1.5 px-3 transition-colors cursor-pointer ${
                      showPreviewFindAndReplace ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : ''
                    }`}
                  >
                    <Replace className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Find & Replace</span>
                  </button>
                </div>

                {/* Find & Replace Drawer */}
                {showPreviewFindAndReplace && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <FindAndReplace<ParsedClosingRateItem>
                      data={parsedItems}
                      columns={findAndReplaceColumns}
                      onReplaceOne={handleReplaceOne}
                      onReplaceAll={handleReplaceAll}
                      onClose={() => setShowPreviewFindAndReplace(false)}
                    />
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3 text-center" style={{ width: '40px' }}>
                          <CustomCheckbox
                            checked={isAllFilteredValidSelected}
                            onChange={handleToggleSelectAllValid}
                          />
                        </th>
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
                      {paginatedItems.map((item, idx) => {
                        const globalIdx = parsedItems.indexOf(item);
                        const isSelected = selectedRateIndices.has(globalIdx);

                        return (
                          <tr key={globalIdx} className={`hover:bg-slate-50 transition-colors ${item.status !== 'Valid' ? 'bg-rose-50/20' : ''}`}>
                            <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <CustomCheckbox
                                checked={isSelected}
                                disabled={item.status !== 'Valid'}
                                onChange={() => handleToggleRow(globalIdx)}
                              />
                            </td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Rows per page:</span>
                    <CustomSelect<number>
                      value={tablePageSize}
                      options={[20, 50, 100]}
                      onChange={(val) => {
                        setTablePageSize(Number(val));
                        setTablePage(1);
                      }}
                      size="xs"
                      menuWidth={75}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">
                      Page {safeTablePage} of {totalTablePages} ({filteredParsedItems.length} items)
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

      {showClientModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <AccountFormModal
            initialData={clientModalInitialData}
            entityLabel="Client"
            groupName="Sundry Debtors"
            onClose={() => setShowClientModal(false)}
            onSuccess={handleClientCreated}
          />,
          document.body
        )}

      {/* Duplicate & Conflict Verification Modal */}
      {duplicateCheckModal?.isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] border border-[var(--color-border-medium)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[var(--color-border-light)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Closing Rates Import Verification</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Date: {importDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDuplicateCheckModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">New Rates</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">{duplicateCheckModal.newRates.length}</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">Will be added</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                    <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Exact Duplicates</div>
                    <div className="text-2xl font-bold text-amber-700 mt-1">{duplicateCheckModal.exactDuplicates.length}</div>
                    <div className="text-[11px] text-amber-600 mt-0.5">Already in DB (skip)</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60">
                    <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Rate Conflicts</div>
                    <div className="text-2xl font-bold text-rose-700 mt-1">{duplicateCheckModal.conflicts.length}</div>
                    <div className="text-[11px] text-rose-600 mt-0.5">Existing rate differs</div>
                  </div>
                </div>

                {/* Conflicts Section */}
                {duplicateCheckModal.conflicts.length > 0 && (
                  <div className="border border-rose-200 rounded-xl overflow-hidden">
                    <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-200 flex items-center gap-2 text-rose-800 font-semibold text-xs uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Conflicts — Already Exists with Different Rate
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-rose-100">
                      {duplicateCheckModal.conflicts.map((c, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-rose-50/30">
                          <div>
                            <span className="font-semibold text-slate-800">{c.securityName}</span>
                            <span className="ml-2 text-slate-500 text-[11px]">({c.currencyCode || 'USD'})</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-slate-500">DB Rate: <strong className="text-slate-800">{c.existingRate}</strong></span>
                            <span className="text-rose-600 font-bold">Incoming: {c.rate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exact Duplicates Section */}
                {duplicateCheckModal.exactDuplicates.length > 0 && (
                  <div className="border border-amber-200 rounded-xl overflow-hidden">
                    <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200 flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Already Exists in Database (Will be Skipped)
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-amber-100">
                      {duplicateCheckModal.exactDuplicates.map((d, i) => (
                        <div key={i} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-amber-50/30">
                          <span className="font-medium text-slate-700">{d.securityName}</span>
                          <span className="text-slate-500">Rate: <strong className="text-slate-800">{d.rate}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Rates Section */}
                {duplicateCheckModal.newRates.length > 0 && (
                  <div className="border border-emerald-200 rounded-xl overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-200 flex items-center gap-2 text-emerald-800 font-semibold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      New Closing Rates Ready to Add ({duplicateCheckModal.newRates.length})
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-emerald-100">
                      {duplicateCheckModal.newRates.map((n, i) => (
                        <div key={i} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-emerald-50/30">
                          <span className="font-medium text-slate-700">{n.securityName}</span>
                          <span className="text-emerald-700 font-semibold">{n.currencyCode || ''} {n.rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-[var(--color-border-light)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDuplicateCheckModal(null)}
                  className="btn btn--secondary text-xs"
                >
                  Cancel
                </button>
                {duplicateCheckModal.newRates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => executeImport(duplicateCheckModal.newRates)}
                    disabled={isProcessing}
                    className="btn btn--primary text-xs flex items-center gap-2"
                  >
                    {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Import {duplicateCheckModal.newRates.length} New Rates Only
                  </button>
                )}
                {duplicateCheckModal.conflicts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => executeImport([...duplicateCheckModal.newRates, ...duplicateCheckModal.conflicts])}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Overwrite Conflicts ({duplicateCheckModal.conflicts.length}) & Import All
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        isOpen={showAdjustConfirm}
        title="Generate Carry Forward / Back Forward Trades"
        message={`Are you sure you want to add Carry Forward and Back Forward trades for ${settlementItems.filter((i) => i.netQty !== 0).length} open positions on ${importDate}?`}
        variant="warning"
        confirmLabel="Generate Trades"
        isLoading={isAdjusting}
        onConfirm={executeAdjustTrades}
        onCancel={() => setShowAdjustConfirm(false)}
      />
    </div>
  );
}
