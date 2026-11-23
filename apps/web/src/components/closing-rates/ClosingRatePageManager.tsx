'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { notify } from '@/utils/toastNotify';
import { OpenPositionVerificationPanel, type PositionVerificationItem } from '../trades/OpenPositionVerificationPanel';
import { generateDubaiSecurityName, cleanScriptFullName } from '../trades/tradeImportHelpers';
import { ScriptFormModal } from '../scripts/ScriptFormModal';
import { FormModal as AccountFormModal } from '../accounts/FormModal';
import { ClosingRateDataTable } from './ClosingRateDataTable';
import { ClosingRateFormModal } from './ClosingRateFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import { UniversalFileUploader } from '@/components/ui/UniversalFileUploader';
import { UniversalPageDropzone } from '@/components/ui/UniversalPageDropzone';
import { UniversalDropdown } from '@/components/ui/UniversalDropdown';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { FindAndReplace, type FindAndReplaceColumn } from '@/components/ui/FindAndReplace';
import { 
  Plus, UploadCloud, ArrowLeft, CheckCircle2, AlertTriangle, FileSpreadsheet, 
  RefreshCw, ChevronDown, ChevronUp, PlusCircle, AlertCircle, X, ShieldAlert, Replace, Search
} from 'lucide-react';
import { 
  parseClosingRatesWithDynamicTemplate,
  parseOpenPositionCSV, 
  processClosingRates, 
  processOpenPositionClosingRates, 
  validateClosingRateImportFile,
  type ParsedClosingRateItem, 
  type OpenPositionParsedRow,
  type FileValidationResult,
} from '../../lib/tradeParser';
import {
  detectFileTemplate,
  fetchFileImportTemplates,
  DEFAULT_CLOSING_RATE_TEMPLATES,
  type FileImportTemplateOption,
} from '../../lib/tradeParser/templateDetector';
import { formatCurrencySymbol } from '@/utils/currency';
import { formatDateToDDMMYY } from '@/utils/dateUtils';
import { useTopBar } from '@/context/TopBarContext';
import { UniversalTooltip } from '@/components/ui/UniversalTooltip';
import { cn } from '@/utils/cn';


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
  const isAddParam = searchParams.get('action') === 'add';

  const [isImportModalOpen, setIsImportModalOpen] = useState(isImportParam);
  const [isAdding, setIsAdding] = useState(isAddParam);

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

  const { setTopBar, resetTopBar } = useTopBar();

  // Push unified page title & actions to TopBar
  useEffect(() => {
    setTopBar({
      title: 'Closing Rates',
      actions: (
        <div className="flex items-center gap-2">
          <UniversalTooltip content="Add a new daily closing rate">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Closing Rate</span>
            </button>
          </UniversalTooltip>
          <UniversalTooltip content="Import closing rates & verify positions from CSV">
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('import', 'true');
                window.history.pushState({}, '', url.toString());
                setIsImportModalOpen(true);
              }}
              className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Position File</span>
            </button>
          </UniversalTooltip>
        </div>
      ),
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar]);

  // Sync state with query parameters
  useEffect(() => {
    if (isImportParam) {
      setIsImportModalOpen(true);
    }
  }, [isImportParam]);

  useEffect(() => {
    if (isAddParam) {
      setIsAdding(true);
    }
  }, [isAddParam]);

  // Open Position Import states
  const [importDate, setImportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [rawOpenPositionRows, setRawOpenPositionRows] = useState<OpenPositionParsedRow[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedClosingRateItem[]>([]);
  const [fileValidationError, setFileValidationError] = useState<FileValidationResult | null>(null);
  const [closingRateTemplates, setClosingRateTemplates] = useState<FileImportTemplateOption[]>(DEFAULT_CLOSING_RATE_TEMPLATES);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('AUTO');
  const [detectedTemplate, setDetectedTemplate] = useState<FileImportTemplateOption | null>(null);

  // Load closing rate templates on mount
  useEffect(() => {
    fetchFileImportTemplates('CLOSING_RATE').then((data) => {
      if (data && data.length > 0) setClosingRateTemplates(data);
    });
  }, []);
  
  // Preview Selection & Search States
  const [selectedRateIndices, setSelectedRateIndices] = useState<Set<number>>(new Set());
  const [previewSearchQuery, setPreviewSearchQuery] = useState('');
  const [previewSearchColumn, setPreviewSearchColumn] = useState('ALL');
  const [showPreviewFindAndReplace, setShowPreviewFindAndReplace] = useState(false);

  // System settlement trades for date verification
  const [settlementItems, setSettlementItems] = useState<any[]>([]);

  // Filter Parsed Closing Rates to only those relevant to active unsettled trades
  // Matched means: script exists in our system and has active unsettled trades
  const activeUnsettledScriptIds = new Set(
    settlementItems
      .filter((i) => i.scriptId && i.netQty !== 0)
      .map((i) => i.scriptId)
  );

  const matchedParsedItems = parsedItems.filter((item) => {
    // If no active settlement trades on this date, show all valid parsed items so user can import closing rates
    if (activeUnsettledScriptIds.size === 0) return item.status === 'Valid';

    // Must have a resolved script ID in our DB that belongs to active unsettled trades
    return item.status === 'Valid' && item.resolvedScriptId && activeUnsettledScriptIds.has(item.resolvedScriptId);
  });

  // Sync selectedRateIndices whenever parsedItems or matchedParsedItems changes
  // Default to selecting all matched rates (which are all Valid and in active unsettled trades)
  useEffect(() => {
    const init = new Set<number>();
    matchedParsedItems.forEach((item) => {
      const idx = parsedItems.indexOf(item);
      if (idx !== -1) init.add(idx);
    });
    setSelectedRateIndices(init);
  }, [matchedParsedItems, parsedItems]);

  // Pagination for Accordion Table
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);

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
    if (isImportModalOpen && importDate) {
      fetchSettlementForDate(importDate);
    }
  }, [isImportModalOpen, importDate]);

  const removeQueryParam = (paramKey: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has(paramKey)) {
      url.searchParams.delete(paramKey);
      const cleanUrl = url.pathname + (url.search ? url.search : '');
      window.history.pushState({}, '', cleanUrl);
    }
  };

  const handleImportBack = () => {
    removeQueryParam('import');
    setIsImportModalOpen(false);
  };

  const handleCloseAdd = () => {
    setIsAdding(false);
    removeQueryParam('action');
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

        // ── Auto-Detect Template if AUTO is selected ──
        let activeTemplate = closingRateTemplates.find((t) => t.code === selectedTemplateCode);
        if (selectedTemplateCode === 'AUTO') {
          const detected = detectFileTemplate(text, closingRateTemplates);
          if (detected) {
            activeTemplate = detected;
            setSelectedTemplateCode(detected.code);
            setDetectedTemplate(detected);
            notify.info('Template Auto-Detected', {
              description: `Detected format: ${detected.name}`,
            });
          } else {
            activeTemplate = closingRateTemplates[0];
            setSelectedTemplateCode(closingRateTemplates[0]?.code || 'BROKER_OPEN_POSITIONS');
          }
        }

        // ── Pre-Parse File Validation Layer ──
        const validation = validateClosingRateImportFile(text, activeTemplate);
        if (!validation.isValid) {
          setFileValidationError(validation);
          setRawOpenPositionRows([]);
          setParsedItems([]);
          notify.error(validation.isCrossFileMismatch ? 'Wrong File Uploaded' : 'Invalid Closing Rate File Format', {
            description: validation.errors[0] || 'File format does not match Open Position schema.',
            duration: 8000,
          });
          setIsProcessing(false);
          return;
        }

        setFileValidationError(null);
        const rawRows = parseClosingRatesWithDynamicTemplate(text, activeTemplate);
        if (rawRows.length === 0) {
          toast.error('No valid rows found in CSV file.');
          setIsProcessing(false);
          return;
        }

        setRawOpenPositionRows(rawRows);
        const items = processClosingRates(rawRows, exchanges, localScripts);
        setParsedItems(items);
        notify.success('Rates Extracted Successfully', {
          description: `Extracted ${items.length} unique closing rates from ${rawRows.length} open position rows.`,
        });
      } catch (err: any) {
        console.error(err);
        notify.error('File Parsing Failed', {
          description: 'Failed to parse open position CSV file.',
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setFileName('');
    setFileValidationError(null);
    setRawOpenPositionRows([]);
    setParsedItems([]);
    setSelectedTemplateCode('AUTO');
    setDetectedTemplate(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Perform Open Position Verification against system settlement trades (One-Way Verification: System -> CSV)
  const performVerification = (): {
    status: 'NO_FILE' | 'VALIDATED' | 'FAILED';
    items: PositionVerificationItem[];
    discrepancies: PositionVerificationItem[];
    netQtyMatched: boolean;
  } => {
    if (rawOpenPositionRows.length === 0) {
      return { status: 'NO_FILE', items: [], discrepancies: [], netQtyMatched: false };
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

    // 3. Asymmetric / One-Way Verification: Only verify system trades against CSV
    // Whatever is in system must match in CSV. Extra positions in CSV are ignored.
    const items: PositionVerificationItem[] = [];

    for (const key of Array.from(systemClientMap.keys())) {
      const sysObj = systemClientMap.get(key);
      const sysQty = sysObj ? sysObj.netQty : 0;
      if (sysQty === 0) continue;

      const csvData = csvClientMap.get(key);
      const csvQty = csvData ? csvData.netLots : 0;

      const diff = sysQty - csvQty;
      const isQtyMatched = Math.abs(diff) <= 0.001;

      const parts = key.split('_');
      const clientCode = parts[0];
      const securityName = parts.slice(1).join('_');

      // Check script in DB
      const isUnmappedScript = !!csvData?.isScriptMissing;

      const isValid = isQtyMatched && !isUnmappedScript;

      let reason = 'Matched';
      if (isUnmappedScript) {
        reason = `Script '${csvData?.commodityCode}' not found in database. Please create script.`;
      } else if (!isQtyMatched) {
        reason = csvQty === 0
          ? `Position in system (Qty: ${sysQty}) is missing in broker position file (Qty: 0)`
          : `Quantity mismatch: System (${sysQty}) vs File (${csvQty})`;
      }

      items.push({
        clientCode,
        securityName,
        commodityCode: csvData?.commodityCode || sysObj?.item?.script?.shortName,
        exchangeCode: csvData?.exchangeCode || sysObj?.item?.exchange?.code,
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
    const netQtyMatched = discrepancies.length === 0;
    const isValidated = netQtyMatched && items.length > 0;

    return {
      status: items.length === 0 ? ('VALIDATED' as const) : (isValidated ? ('VALIDATED' as const) : ('FAILED' as const)),
      items,
      discrepancies,
      netQtyMatched,
    };
  };

  const verification = performVerification();
  const isValidated = verification.status === 'VALIDATED';

  const executeImport = async (ratesToImport: any[]) => {
    if (!ratesToImport || ratesToImport.length === 0) {
      notify.error('Import Failed', { description: 'No rates to import.' });
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
      notify.success('Rates Imported', {
        description: `Successfully imported ${result.importedCount} closing rates for ${importDate}!`,
      });
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
    // Check if any selected item is unmapped (script missing in DB)
    const selectedIndicesList = Array.from(selectedRateIndices);
    const selectedItems = selectedIndicesList.map((idx) => parsedItems[idx]).filter(Boolean);

    const unmappedSelected = selectedItems.filter(
      (item) => item.status !== 'Valid' || !item.resolvedScriptId
    );

    if (unmappedSelected.length > 0) {
      const firstUnmapped = unmappedSelected[0];
      toast.error(
        `Script '${firstUnmapped.commodityCode}' (${firstUnmapped.securityName}) is not in database. Please create this script before importing!`,
        { duration: 6000 }
      );
      handleOpenScriptModal(firstUnmapped.commodityCode, firstUnmapped.securityName, firstUnmapped.exchangeCode);
      return;
    }

    const validItems = selectedItems.filter(
      (item) => item.status === 'Valid' && item.resolvedExchangeId && item.resolvedScriptId
    );
    if (validItems.length === 0) {
      toast.error('No valid mapped scripts selected to import. Please select at least one valid script.');
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

  const renderImportModal = () => {
    if (!isImportModalOpen) return null;

    // Use matchedParsedItems (matched against active unsettled trades) by default
    const validCount = matchedParsedItems.filter((i) => i.status === 'Valid').length;
    const selectedCount = matchedParsedItems.filter((i) => {
      const gIdx = parsedItems.indexOf(i);
      return gIdx !== -1 && selectedRateIndices.has(gIdx);
    }).length;
    const unmappedCount = matchedParsedItems.filter((i) => i.status === 'Unmapped').length;

    // Filter parsed items based on preview search
    const filteredParsedItems = matchedParsedItems.filter((item) => {
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

    const handleToggleSelectAllFiltered = () => {
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

    const handleSelectAllValid = () => {
      setSelectedRateIndices((prev) => {
        const next = new Set(prev);
        matchedParsedItems.forEach((item) => {
          if (item.status === 'Valid') {
            const idx = parsedItems.indexOf(item);
            if (idx !== -1) next.add(idx);
          }
        });
        return next;
      });
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

    return typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150 select-none">
          <div
            className={cn(
              "flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-200",
              parsedItems.length > 0
                ? "w-[98vw] max-w-7xl h-[94vh] max-h-[94vh]"
                : "w-full max-w-xl max-h-[88vh]"
            )}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#2652C8] shadow-2xs">
                  <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900 font-display">
                      Open Position Import (Closing Rates)
                    </h2>
                    {parsedItems.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 rounded-full px-2.5 py-0.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Data Preserved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {parsedItems.length > 0
                      ? 'Review extracted closing rates, verify against settlement, and commit to ledger.'
                      : 'Upload daily Open Position CSV file to extract closing rates & verify positions.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleImportBack}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Close dialog (retains uploaded data)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Switch between Initial Upload State and Preview State */}
            {parsedItems.length === 0 ? (
              /* ── 1. Initial Upload State (Clean, Compact, No Dropzone after file selected) ── */
              <div className="p-6 overflow-y-auto space-y-5 bg-slate-50/50 flex-1">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                  {/* Top Section: Date & Template Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Import Rate Date <span className="text-rose-500">*</span>
                      </label>
                      <UniversalDatePicker
                        value={importDate}
                        onChange={(d) => setImportDate(d)}
                        placeholder="DD-MM-YY"
                      />
                      <p className="text-[11px] text-slate-400">Closing rates extracted from this file will be saved under this date.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                        <span>File Format / Template</span>
                        {detectedTemplate && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Auto-detected
                          </span>
                        )}
                      </label>
                      <UniversalDropdown
                        value={selectedTemplateCode}
                        options={[
                          { value: 'AUTO', label: 'Auto (Auto Detect)' },
                          ...closingRateTemplates.map((t) => ({
                            value: t.code,
                            label: `${t.name} (${t.code})`,
                          })),
                        ]}
                        onChange={(val) => {
                          setSelectedTemplateCode(val);
                          if (val === 'AUTO') {
                            setDetectedTemplate(null);
                          } else {
                            const found = closingRateTemplates.find((t) => t.code === val);
                            if (found) setDetectedTemplate(found);
                          }
                        }}
                        disabled={isProcessing}
                      />
                      <p className="text-[11px] text-slate-400">Auto detects schema signatures or select custom mapping.</p>
                    </div>
                  </div>

                  {/* Bottom Section: File Upload Component */}
                  <div className="pt-4 border-t border-slate-100 space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Open Position CSV File <span className="text-rose-500">*</span>
                    </label>
                    <UniversalFileUploader
                      onFileSelect={handleFileSelect}
                      onClear={handleClearFile}
                      fileName={fileName}
                      isProcessing={isProcessing}
                      isInvalid={Boolean(fileValidationError)}
                      accept=".csv, .txt"
                      title="Select or drop Open Position CSV"
                      description="Supports CSV, TXT files (drag & drop or click to browse)"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* ── 2. Preview State (Full-Width, Directly Visible Table, Dropzone Hidden) ── */
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
                {/* Control Strip: Active File Pill, Verification Status, and Action Buttons */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs shadow-2xs">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8]">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-mono font-bold text-slate-900 truncate max-w-[200px]" title={fileName}>{fileName}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-600 font-medium">Date: {formatDateToDDMMYY(importDate) || importDate}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 font-semibold">{rawOpenPositionRows.length.toLocaleString()} rows</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] flex items-center gap-1">
                        {detectedTemplate?.name || closingRateTemplates.find((t) => t.code === selectedTemplateCode)?.name || selectedTemplateCode}
                        {detectedTemplate && (
                          <span className="text-[9px] bg-emerald-200/70 text-emerald-800 font-semibold px-1 rounded">
                            Auto
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Clean single-line Remove file button (compact X icon with tooltip) */}
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                    <button
                      onClick={handleConfirmImport}
                      disabled={isProcessing || selectedCount === 0}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[#2652C8] hover:bg-[#1E40AF] text-white shadow-md shadow-blue-600/20 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>Import {selectedCount} Selected Rates</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Minimalist Stats Chips Bar */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Matched Closing Rates Chip */}
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-slate-500">Matched Closing Rates:</span>
                    <span className="text-sm font-extrabold font-mono text-slate-900">{matchedParsedItems.length}</span>
                    {matchedParsedItems.length < parsedItems.length && (
                      <span className="text-[11px] text-slate-400 font-medium">({parsedItems.length} in file)</span>
                    )}
                  </div>

                  {/* Net Quantity Matched Chip */}
                  <div className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl border shadow-2xs text-xs font-semibold",
                    verification.netQtyMatched
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  )}>
                    {verification.netQtyMatched ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Net Quantity: <strong>Matched (True)</strong></span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Net Quantity: <strong>Mismatched ({verification.discrepancies.length})</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Closing Rates Table (Directly Visible, not collapsed in an accordion) */}
                <div className="card shadow-2xs border border-slate-200/90 overflow-hidden bg-white p-4 space-y-3 rounded-xl">
                  {/* Preview Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                      {/* Column-targeted Search */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all max-w-md w-full">
                        <div className="w-35 shrink-0 border-r border-slate-200">
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
                            triggerClassName="min-h-8.5 h-8.5 rounded-none rounded-l-lg border-0 bg-slate-50/70 hover:bg-slate-100 shadow-none px-2 text-[11px] font-semibold text-slate-800"
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
                      <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                        <strong>{selectedCount}</strong> selected
                      </span>

                      <button
                        type="button"
                        onClick={handleSelectAllValid}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                      >
                        Select All Valid
                      </button>

                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
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

                  {/* Data Table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-3 text-center" style={{ width: '40px' }}>
                            <CustomCheckbox
                              checked={isAllFilteredValidSelected}
                              onChange={handleToggleSelectAllFiltered}
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
                            <tr key={globalIdx} className={`hover:bg-slate-50 transition-colors ${item.status !== 'Valid' ? 'bg-amber-50/25' : ''}`}>
                              <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <CustomCheckbox
                                  checked={isSelected}
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
                              <td className="py-3 px-4 font-mono text-slate-600">{formatDateToDDMMYY(item.expiryDate) || item.delMonth || '—'}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                {formatCurrencySymbol(item.currencySymbol, item.currencyCode)}{item.closingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {item.status === 'Valid' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Valid</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenScriptModal(item.commodityCode, item.securityName, item.exchangeCode)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer transition-colors shadow-2xs"
                                    title="Script not found in database. Click to create this script before importing."
                                  >
                                    <Plus className="w-3 h-3 text-amber-700 stroke-[2.5]" />
                                    <span>Add Script First</span>
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

                {/* Open Position Verification Panel with Search & Filters */}
                {verification.items && verification.items.length > 0 && (
                  <div className="pt-2">
                    <OpenPositionVerificationPanel
                      items={verification.items}
                      isValidated={isValidated}
                      onAddScript={handleOpenScriptModal}
                      onAddClient={handleOpenClientModal}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      );
    };

  return (
    <div className="space-y-4">
      <ClosingRateDataTable 
        closingRates={initialClosingRates} 
        exchanges={exchanges} 
        scripts={localScripts} 
      />

      {isAdding && (
        <ClosingRateFormModal 
          exchanges={exchanges}
          scripts={localScripts}
          onClose={handleCloseAdd} 
        />
      )}

      {renderImportModal()}

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
            <div className="bg-(--bg-card) border border-border-medium rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border-light flex items-center justify-between">
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

              <div className="p-4 bg-slate-50 border-t border-border-light flex items-center justify-end gap-3">
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

      {/* Universal Drag & Drop File Listener on Closing Rates page */}
      <UniversalPageDropzone
        onFileDrop={(file) => {
          setIsImportModalOpen(true);
          handleFileSelect(file);
        }}
        title="Drop Open Position File to Import Rates"
        subtitle="Drop your daily Open Position CSV file anywhere to extract closing rates & verify positions"
        acceptedExtensions={['.csv', '.txt']}
      />
    </div>
  );
}
