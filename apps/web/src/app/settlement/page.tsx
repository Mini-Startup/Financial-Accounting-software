'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { 
  Search, Calculator, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, 
  Eye, EyeOff, FileSpreadsheet, CheckCircle2, ChevronDown, ChevronUp, PlusCircle, Plus,
  Layers, Zap, History, ShieldAlert, AlertCircle, X, Check, ArrowRight
} from 'lucide-react';
import { parseOpenPositionCSV, processOpenPositionClosingRates, type ParsedClosingRateItem, type OpenPositionParsedRow } from '../../lib/tradeParser/openPositionParser';
import { OpenPositionVerificationPanel, type PositionVerificationItem } from '../../components/trades/OpenPositionVerificationPanel';
import { generateDubaiSecurityName, cleanScriptFullName } from '../../components/trades/tradeImportHelpers';
import { ScriptFormModal } from '../../components/scripts/ScriptFormModal';

interface SettlementItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  role: 'CLIENT' | 'BROKER';
  securityName: string;
  scriptId: string;
  scriptShortName: string;
  scriptFullName: string;
  exchangeId: string;
  exchangeCode: string;
  currencyCode?: string;
  currencySymbol?: string;
  expiry: string | null;
  buyQty: number;
  buyVal: number;
  buyAvgRate: number;
  sellQty: number;
  sellVal: number;
  sellAvgRate: number;
  netQty: number;
  netVal: number;
  netAvgRate: number;
  realizedPnL: number;
  closingRate: number | null;
}

interface SettlementRecord {
  id: string;
  name: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  _count?: { trades: number };
}

export default function SettlementPage() {
  const [reportDate, setReportDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SettlementItem[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showAutoCalculated, setShowAutoCalculated] = useState(false);

  // Settlement Cycles state
  const [settlementsList, setSettlementsList] = useState<SettlementRecord[]>([]);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string>('LIVE');
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);

  // Settlement Execution Preview state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    preview: any[];
    errors: any[];
    settlementFromDate: string;
    settlementToDate: string;
    unsettledTradesCount: number;
  } | null>(null);
  const [isExecutingSettlement, setIsExecutingSettlement] = useState(false);

  // System reference data for parsing
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  // Script Creation Modal States
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptModalInitialData, setScriptModalInitialData] = useState<any>(null);

  // Open Position File verification states
  const [openPositionFileName, setOpenPositionFileName] = useState('');
  const [openPositionRows, setOpenPositionRows] = useState<OpenPositionParsedRow[]>([]);
  const [parsedRates, setParsedRates] = useState<ParsedClosingRateItem[]>([]);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false); // Closed by default
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Accordion pagination
  const [filePage, setFilePage] = useState(1);
  const [filePageSize, setFilePageSize] = useState(20);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLIENT' | 'BROKER'>('ALL');
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettlementsList = async () => {
    setIsLoadingSettlements(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/settlements`);
      if (res.ok) {
        const data = await res.json();
        setSettlementsList(data);
      }
    } catch (err) {
      console.error('Failed to load settlements list:', err);
    } finally {
      setIsLoadingSettlements(false);
    }
  };

  const fetchScripts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`);
      if (res.ok) {
        const data = await res.json();
        setScripts(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch scripts:', err);
    }
  };

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
      currencyId: (currencies[0]?.id || ''),
    });
    setShowScriptModal(true);
  };

  const handleScriptCreated = async () => {
    setShowScriptModal(false);
    const updatedScripts = await fetchScripts();
    if (updatedScripts && openPositionRows.length > 0) {
      const processed = processOpenPositionClosingRates(openPositionRows, exchanges, updatedScripts);
      setParsedRates(processed);
    }
    toast.success('Script added! Open position verification updated.');
  };

  useEffect(() => {
    // Set default date to today
    const today = new Date();
    setReportDate(today.toISOString().split('T')[0]);

    // Fetch exchanges & scripts & currencies & settlements
    const loadRefData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const [exRes, scRes, curRes] = await Promise.all([
          fetch(`${apiUrl}/exchanges`),
          fetch(`${apiUrl}/scripts`),
          fetch(`${apiUrl}/currencies`),
        ]);
        if (exRes.ok) setExchanges(await exRes.json());
        if (scRes.ok) setScripts(await scRes.json());
        if (curRes.ok) setCurrencies(await curRes.json());
        await fetchSettlementsList();
      } catch (err) {
        console.error('Failed to load reference data:', err);
      }
    };
    loadRefData();
  }, []);

  const fetchSettlementSummary = async (date: string, settlementId: string = 'LIVE') => {
    let url = '';
    if (settlementId === 'LIVE') {
      url = `${process.env.NEXT_PUBLIC_API_URL}/settlement?settlementId=LIVE&date=${date}`;
    } else {
      url = `${process.env.NEXT_PUBLIC_API_URL}/settlement?settlementId=${settlementId}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setSummaryData(data);
      setHasGenerated(true);
      return data;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate settlement summary');
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedSettlementId === 'LIVE' && !reportDate) {
      toast.error('Please select a Date');
      return;
    }

    setLoading(true);
    setShowAutoCalculated(false);
    try {
      await fetchSettlementSummary(reportDate, selectedSettlementId);
      toast.success(
        selectedSettlementId === 'LIVE'
          ? `Generated live positions summary up to ${reportDate}`
          : `Loaded summary for selected settlement`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to connect to the backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleSettlementSelectionChange = (newSettlementId: string) => {
    setSelectedSettlementId(newSettlementId);
    setHasGenerated(false);
    setSummaryData([]);
    if (newSettlementId !== 'LIVE') {
      const s = settlementsList.find((item) => item.id === newSettlementId);
      if (s) {
        setReportDate(new Date(s.toDate).toISOString().split('T')[0]);
      }
    }
  };

  const handleOpenSettlementPreview = async () => {
    if (!reportDate) {
      toast.error('Please select a closing rate date for settlement.');
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingRateDate: reportDate }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to compute settlement preview');
      }

      const data = await res.json();
      setPreviewModal({
        isOpen: true,
        preview: data.preview || [],
        errors: data.errors || [],
        settlementFromDate: data.settlementFromDate,
        settlementToDate: data.settlementToDate,
        unsettledTradesCount: data.unsettledTradesCount || 0,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error computing settlement preview');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleConfirmExecuteSettlement = async () => {
    if (!reportDate) return;
    setIsExecutingSettlement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingRateDate: reportDate }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to execute settlement');
      }

      const data = await res.json();
      toast.success(
        `Settlement created successfully! Added ${data.cfCount} CF trades, ${data.bfCount} BF trades, ${data.settlementCount} Settlement trades, and ${data.ledgerEntriesCount} Ledger entries.`
      );
      setPreviewModal(null);
      await fetchSettlementsList();
      if (data.settlement?.id) {
        setSelectedSettlementId(data.settlement.id);
        await fetchSettlementSummary(reportDate, data.settlement.id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error executing settlement');
    } finally {
      setIsExecutingSettlement(false);
    }
  };

  // Open Position CSV Upload Handler
  const handleOpenPositionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOpenPositionFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const rawRows = parseOpenPositionCSV(text);
        if (rawRows.length === 0) {
          toast.error('No valid rows found in Open Position CSV.');
          return;
        }

        setOpenPositionRows(rawRows);
        const processed = processOpenPositionClosingRates(rawRows, exchanges, scripts);
        setParsedRates(processed);
        toast.success(`Parsed ${rawRows.length} open position rows from ${file.name}`);
      } catch (err: any) {
        console.error(err);
        toast.error('Error reading Open Position CSV file.');
      }
    };
    reader.readAsText(file);
  };

  // Compute Open Position Verification against generated Settlement Summary
  const performVerification = () => {
    if (openPositionRows.length === 0 || !hasGenerated) {
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

    for (const row of openPositionRows) {
      const clientCode = row.clientCode.trim().toUpperCase();
      if (!clientCode) continue;

      const scriptObj = scripts.find(
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

      // Net lots in row
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
    const systemClientMap = new Map<string, { item: SettlementItem; netQty: number }>();
    const clientSummaryItems = summaryData.filter((i) => i.role === 'CLIENT' && i.netQty !== 0);

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

  // Handle Add or Adjust Trades button click
  const handleAddAdjustTrades = async () => {
    if (!isValidated) {
      toast.error('Open Position validation must pass before adding or adjusting trades.');
      return;
    }

    const openPositions = summaryData.filter((i) => i.netQty !== 0);
    if (openPositions.length === 0) {
      toast.error('No open positions available to adjust.');
      return;
    }

    if (!confirm(`Are you sure you want to add Carry Forward and Back Forward trades for ${openPositions.length} open positions on ${reportDate}?`)) {
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
          reportDate,
          adjustments,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create adjustment trades');
      }

      const result = await res.json();
      toast.success(`Successfully added ${result.createdCount} Carry Forward & Back Forward trades!`);
      
      // Re-fetch settlement summary
      await fetchSettlementSummary(reportDate);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error executing trade adjustments');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Filter logic
  const filteredData = summaryData.filter(item => {
    const matchesSearch = 
      item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scriptShortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scriptFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.exchangeCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = 
      roleFilter === 'ALL' ? true : item.role === roleFilter;

    const matchesPosition = 
      positionFilter === 'ALL' ? true :
      positionFilter === 'OPEN' ? item.netQty !== 0 :
      item.netQty === 0;

    return matchesSearch && matchesRole && matchesPosition;
  });

  const settledData = filteredData.map(item => {
    const finalPnL = item.netQty === 0
      ? item.realizedPnL
      : item.closingRate !== null
        ? item.netQty * (item.closingRate - item.netAvgRate)
        : 0;
    return {
      ...item,
      finalPnL
    };
  });

  const getSym = (item: { currencySymbol?: string; currencyCode?: string }) =>
    item.currencySymbol || (item.currencyCode === 'INR' ? '₹' : '$');

  const totalVolume = filteredData.reduce((sum, item) => sum + item.buyQty + item.sellQty, 0);
  const openPositionsCount = filteredData.filter(item => item.netQty !== 0).length;
  const netTotalPnL = settledData.reduce((sum, item) => sum + item.finalPnL, 0);

  const pnlByCurrency = settledData.reduce((acc, item) => {
    const symbol = getSym(item);
    acc[symbol] = (acc[symbol] || 0) + item.finalPnL;
    return acc;
  }, {} as Record<string, number>);

  const pnlDisplayStr = Object.keys(pnlByCurrency).length === 0
    ? '$0.00'
    : Object.entries(pnlByCurrency)
        .map(([symbol, val]) => `${val >= 0 ? '+' : '-'}${symbol}${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join(' / ');

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const getNextDayStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const carryForwardDateFormatted = formatDateStr(reportDate);
  const backForwardDateFormatted = getNextDayStr(reportDate);
  const openPositions = filteredData.filter(item => item.netQty !== 0);

  // Accordion pagination slicing
  const totalFilePages = Math.max(1, Math.ceil(openPositionRows.length / filePageSize));
  const safeFilePage = Math.min(filePage, totalFilePages);
  const paginatedFileRows = openPositionRows.slice(
    (safeFilePage - 1) * filePageSize,
    safeFilePage * filePageSize
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Settlement</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Generate daily summarized trade positions, average rates, and verify against Open Position files.
          </p>
        </div>
      </div>

      {/* Settlement Cycle Selector Card */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Settlement Period / Batch</span>
            </div>
            <h2 className="text-lg font-bold text-white">Select Settlement Cycle</h2>
            <p className="text-xs text-slate-300">
              View live open positions or select any finalized historical settlement batch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSettlementId}
              onChange={(e) => handleSettlementSelectionChange(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="LIVE">⚡ Live / Open Positions (Unsettled)</option>
              {settlementsList.map((s) => (
                <option key={s.id} value={s.id}>
                  📁 {s.name} ({formatDateStr(s.fromDate)} – {formatDateStr(s.toDate)}) • {s._count?.trades || 0} trades
                </option>
              ))}
            </select>
            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="btn btn--primary text-xs flex items-center gap-1.5 py-2.5 px-4 rounded-xl"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date & Open Position Upload Form Card (For Live Settlements) */}
      {selectedSettlementId === 'LIVE' ? (
        <div className="card">
          <div className="card__body p-6">
            <form onSubmit={handleGenerate} className="flex flex-col md:flex-row items-end gap-6">
              <div className="form-field flex-1 max-w-xs">
                <label className="form-label form-label--required">Closing Rate Date (Cutoff)</label>
                <input 
                  type="date" 
                  value={reportDate} 
                  onChange={e => setReportDate(e.target.value)} 
                  className="input w-full"
                  required 
                />
              </div>

              <div className="form-field flex-1 max-w-sm">
                <label className="form-label">Upload Open Position CSV (Verification)</label>
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleOpenPositionFileUpload}
                    accept=".csv, .txt"
                    className="hidden"
                    id="open-pos-csv-settlement"
                  />
                  <label 
                    htmlFor="open-pos-csv-settlement"
                    className="btn btn--secondary flex-1 flex items-center justify-center gap-2 cursor-pointer py-2 text-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="truncate">{openPositionFileName ? openPositionFileName : 'Upload Open Position CSV'}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn--primary h-[42px] px-6 flex items-center justify-center gap-2 w-full md:w-auto shrink-0"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Generate Summary
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenSettlementPreview}
                  disabled={isAdjusting || !hasGenerated}
                  className="px-5 h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Compute and preview Carry Forward, Back Forward, and Settlement trades"
                >
                  {isAdjusting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-emerald-300" />}
                  <span>Generate CF/BF/Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Historical Settlement Banner */
        <div className="card p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              FINALIZED
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                {settlementsList.find(s => s.id === selectedSettlementId)?.name}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Period: {formatDateStr(settlementsList.find(s => s.id === selectedSettlementId)?.fromDate || '')} to {formatDateStr(settlementsList.find(s => s.id === selectedSettlementId)?.toDate || '')}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
            Read-only Historical Record
          </span>
        </div>
      )}

      {/* Verification Status & Adjust Trades Bar */}
      {hasGenerated && (
        <div className="card p-5 bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Validation Status:</span>
            {verification.status === 'VALIDATED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Open Position Verified
              </span>
            ) : verification.status === 'FAILED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Open Position Not Validated ({verification.discrepancies.length} mismatches)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                No Open Position File Uploaded
              </span>
            )}
          </div>

          {/* Add or Adjust Trades Button */}
          <button
            onClick={handleAddAdjustTrades}
            disabled={!isValidated || isAdjusting || openPositions.length === 0}
            className={`btn flex items-center gap-2 py-2 px-5 text-xs font-bold transition-all shadow-sm ${
              isValidated && openPositions.length > 0 && !isAdjusting
                ? 'btn--primary bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
            title={!isValidated ? 'Validation must pass to enable Add / Adjust Trades' : 'Create Carry Forward & Back Forward trades'}
          >
            {isAdjusting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Adding / Adjusting Trades…
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" /> Add / Adjust Trades
              </>
            )}
          </button>
        </div>
      )}

      {/* Open Position Verification Panel with Search & Filters */}
      {hasGenerated && openPositionRows.length > 0 && verification.items && verification.items.length > 0 && (
        <OpenPositionVerificationPanel
          items={verification.items}
          isValidated={isValidated}
          onAddScript={handleOpenScriptModal}
        />
      )}

      {/* Collapsible Accordion for Open Position File (Closed by Default) */}
      {openPositionRows.length > 0 && (
        <div className="card shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="w-full p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Uploaded Open Position File ({openPositionFileName}) — {openPositionRows.length} rows</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <span>{isAccordionOpen ? 'Hide File Content' : 'View File Content'}</span>
              {isAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isAccordionOpen && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3">#</th>
                      <th className="p-3">Client Code</th>
                      <th className="p-3">Exchange</th>
                      <th className="p-3">Commodity Code</th>
                      <th className="p-3">Expiry / DelMonth</th>
                      <th className="p-3">Type / Strike</th>
                      <th className="p-3 text-right">Closing Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedFileRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-400">{(safeFilePage - 1) * filePageSize + idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{r.clientCode}</td>
                        <td className="p-3 font-bold text-slate-700">{r.exchange}</td>
                        <td className="p-3 font-mono text-blue-700">{r.commodityCode}</td>
                        <td className="p-3 font-mono text-slate-600">{r.delMonth || r.expiryDate || '—'}</td>
                        <td className="p-3 text-slate-600">{r.futureOption} {r.callPut} {r.strikePrice}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">₹{r.closingPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Accordion Pagination */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold">Rows per page:</span>
                  <select
                    value={filePageSize}
                    onChange={(e) => {
                      setFilePageSize(Number(e.target.value));
                      setFilePage(1);
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
                    Page {safeFilePage} of {totalFilePages} ({openPositionRows.length} total rows)
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={safeFilePage === 1}
                      onClick={() => setFilePage((prev) => Math.max(prev - 1, 1))}
                      className="btn btn--secondary py-1 px-2 text-xs disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={safeFilePage === totalFilePages}
                      onClick={() => setFilePage((prev) => Math.min(prev + 1, totalFilePages))}
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

      {hasGenerated && (
        <>
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="card__body flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Settled P&L</p>
                  <h3 className={`text-h2 font-display mt-2 font-bold ${netTotalPnL >= 0 ? 'text-[var(--color-forest)]' : 'text-[var(--color-negative)]'}`}>
                    {pnlDisplayStr}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${netTotalPnL >= 0 ? 'bg-emerald-50 text-[var(--color-forest)]' : 'bg-red-50 text-[var(--color-negative)]'}`}>
                  {netTotalPnL >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card__body flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Traded Volume</p>
                  <h3 className="text-h2 font-display mt-2 font-bold text-[var(--color-charcoal)]">
                    {totalVolume.toLocaleString('en-IN')} shares
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Calculator className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card__body flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Open Positions (Scripts)</p>
                  <h3 className="text-h2 font-display mt-2 font-bold text-[var(--color-charcoal)]">
                    {openPositionsCount}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <RefreshCw className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Summary Header with Toggle Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
            <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Settlement Summary</h3>
            {openPositions.length > 0 && (
              <button
                onClick={() => setShowAutoCalculated(!showAutoCalculated)}
                className={`btn ${showAutoCalculated ? 'btn--primary' : 'btn--secondary'} flex items-center justify-center gap-2 text-xs py-2 px-4 shadow-sm`}
              >
                {showAutoCalculated ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Auto-Calculated Trades
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Auto Calculated Trades
                  </>
                )}
              </button>
            )}
          </div>

          {/* Filters and List */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-mist)] p-4 rounded-xl border border-[var(--sidebar-divider)]">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                <input 
                  type="text"
                  placeholder="Search by client, broker, script..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>

              {/* Action Buttons & Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-slate)] font-medium">Role:</span>
                  <select 
                    value={roleFilter} 
                    onChange={e => setRoleFilter(e.target.value as any)} 
                    className="input py-1.5 px-3 text-xs"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="CLIENT">Client Only</option>
                    <option value="BROKER">Broker Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-slate)] font-medium">Position:</span>
                  <select 
                    value={positionFilter} 
                    onChange={e => setPositionFilter(e.target.value as any)} 
                    className="input py-1.5 px-3 text-xs"
                  >
                    <option value="ALL">All Positions</option>
                    <option value="OPEN">Open Positions</option>
                    <option value="CLOSED">Closed Positions</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="card">
              <div className="card__body p-0 overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Party Code & Name</th>
                      <th>Role</th>
                      <th>Security Name (Exchange)</th>
                      <th>Expiry</th>
                      <th className="text-right">Buy Qty</th>
                      <th className="text-right">Buy Avg Price</th>
                      <th className="text-right">Sell Qty</th>
                      <th className="text-right">Sell Avg Price</th>
                      <th className="text-right">Net Qty</th>
                      <th className="text-right">Net Avg Price</th>
                      <th className="text-right">Closing Rate</th>
                      <th className="text-right">Profit & Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settledData.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-[var(--color-slate)] font-medium">
                          No matching settlement summary rows found.
                        </td>
                      </tr>
                    ) : (
                      settledData.map((item, index) => {
                        const isNetLong = item.netQty > 0;
                        const isClosed = item.netQty === 0;
                        const secName = item.securityName || item.scriptShortName || '—';
                        const s = getSym(item);

                        return (
                          <tr key={`${item.accountId}_${item.securityName}_${item.exchangeId}_${index}`}>
                            <td>
                              <div className="font-mono font-medium text-[var(--color-charcoal)]">{item.accountCode}</div>
                              <div className="text-xs text-[var(--color-slate)] truncate max-w-[200px]">{item.accountName}</div>
                            </td>
                            <td>
                              <span className={`badge ${item.role === 'CLIENT' ? 'badge--success' : 'badge--warning'}`}>
                                {item.role}
                              </span>
                            </td>
                            <td>
                              <div className="font-semibold text-[var(--color-charcoal)]">{secName}</div>
                              <div className="text-[10px] text-[var(--color-slate)] font-mono">
                                {item.exchangeCode}{item.scriptShortName && item.scriptShortName !== secName ? ` • ${item.scriptShortName}` : ''}
                              </div>
                            </td>
                            <td className="font-mono text-xs text-[var(--color-slate)]">
                              {item.expiry || '—'}
                            </td>
                            <td className="text-right font-mono">{item.buyQty.toLocaleString('en-IN')}</td>
                            <td className="text-right font-mono">{s}{item.buyAvgRate.toFixed(2)}</td>
                            <td className="text-right font-mono">{item.sellQty.toLocaleString('en-IN')}</td>
                            <td className="text-right font-mono">{s}{item.sellAvgRate.toFixed(2)}</td>
                            <td className={`text-right font-mono font-semibold`}>
                              {isClosed ? (
                                <span className="text-[var(--color-slate)]/50">CLOSED</span>
                              ) : (
                                <span className={isNetLong ? 'text-[var(--color-forest)]' : 'text-[var(--color-negative)]'}>
                                  {isNetLong ? '+' : ''}{item.netQty.toLocaleString('en-IN')}
                                </span>
                              )}
                            </td>
                            <td className="text-right font-mono font-medium">
                              {isClosed ? '—' : `${s}${item.netAvgRate.toFixed(2)}`}
                            </td>
                            <td className="text-right font-mono font-medium">
                              {isClosed ? (
                                <span className="text-[var(--color-slate)]/40">—</span>
                              ) : item.closingRate === null ? (
                                <span className="text-amber-600 font-semibold" title="Missing closing rate in DB">Missing</span>
                              ) : (
                                `${s}${item.closingRate.toFixed(2)}`
                              )}
                            </td>
                            <td className={`text-right font-mono font-semibold`}>
                              <span className={item.finalPnL > 0 ? 'text-[var(--color-forest)]' : item.finalPnL < 0 ? 'text-[var(--color-negative)]' : 'text-[var(--color-slate)]'}>
                                {item.finalPnL > 0 ? '+' : ''}{s}{Math.abs(item.finalPnL).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* Auto-Calculated Forwarding Tables */}
          {showAutoCalculated && openPositions.length > 0 && (
            <div className="space-y-8 animate-fadeIn pt-4">
              <hr className="border-[var(--sidebar-divider)]" />
              
              {/* Carry Forward Section */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Carry Forwarded Trades</h3>
                    <p className="text-xs text-[var(--color-slate)]">
                      These closing trades invert the remaining open quantity. Will be added on date: <span className="font-semibold text-[var(--color-charcoal)]">{carryForwardDateFormatted}</span>.
                    </p>
                  </div>
                  <span className="badge badge--neutral text-xs">Closing Rate Valuation</span>
                </div>

                <div className="card">
                  <div className="card__body p-0 overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Party Code & Name</th>
                          <th>Role</th>
                          <th>Script (Exchange)</th>
                          <th>Expiry</th>
                          <th>Action</th>
                          <th className="text-right">Quantity</th>
                          <th className="text-right">Valuation Rate</th>
                          <th className="text-right">Valuation Amount</th>
                          <th>Add Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPositions.map((item, index) => {
                          const action = item.netQty > 0 ? 'SELL' : 'BUY';
                          const qty = Math.abs(item.netQty);
                          const rate = item.closingRate ?? 0;
                          const hasNoRate = item.closingRate === null;

                          return (
                            <tr key={`cf_${item.accountId}_${item.scriptId}_${index}`}>
                              <td>
                                <div className="font-mono font-medium text-[var(--color-charcoal)]">{item.accountCode}</div>
                                <div className="text-xs text-[var(--color-slate)] truncate max-w-[200px]">{item.accountName}</div>
                              </td>
                              <td>
                                <span className={`badge ${item.role === 'CLIENT' ? 'badge--success' : 'badge--warning'}`}>
                                  {item.role}
                                </span>
                              </td>
                              <td>
                                <div className="font-semibold text-[var(--color-charcoal)]">{item.scriptShortName}</div>
                                <div className="text-[10px] text-[var(--color-slate)]">{item.exchangeCode}</div>
                              </td>
                              <td className="font-mono text-xs text-[var(--color-slate)]">{item.expiry || '—'}</td>
                              <td>
                                <span className={`badge ${action === 'BUY' ? 'badge--success' : 'badge--warning'} font-bold`}>
                                  {action}
                                </span>
                              </td>
                              <td className="text-right font-mono">
                                {hasNoRate ? (
                                  <span className="text-amber-600 flex items-center justify-end gap-1 text-xs font-semibold" title="Please add a closing rate for this script in the database.">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {getSym(item)}0.00 (Missing)
                                  </span>
                                ) : (
                                  `${getSym(item)}${rate.toFixed(2)}`
                                )}
                              </td>
                              <td className="text-right font-mono font-semibold">
                                {getSym(item)}{(qty * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="text-xs font-medium text-[var(--color-charcoal)]">{carryForwardDateFormatted}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Back Forward Section */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Back Forwarded Trades</h3>
                    <p className="text-xs text-[var(--color-slate)]">
                      These opening trades re-establish the positions on the next day. Will be added on date: <span className="font-semibold text-[var(--color-charcoal)]">{backForwardDateFormatted}</span>.
                    </p>
                  </div>
                  <span className="badge badge--neutral text-xs">Opening Position Re-entry</span>
                </div>

                <div className="card">
                  <div className="card__body p-0 overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Party Code & Name</th>
                          <th>Role</th>
                          <th>Script (Exchange)</th>
                          <th>Expiry</th>
                          <th>Action</th>
                          <th className="text-right">Quantity</th>
                          <th className="text-right">Valuation Rate</th>
                          <th className="text-right">Valuation Amount</th>
                          <th>Add Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPositions.map((item, index) => {
                          const action = item.netQty > 0 ? 'BUY' : 'SELL';
                          const qty = Math.abs(item.netQty);
                          const rate = item.closingRate ?? 0;
                          const hasNoRate = item.closingRate === null;

                          return (
                            <tr key={`bf_${item.accountId}_${item.scriptId}_${index}`}>
                              <td>
                                <div className="font-mono font-medium text-[var(--color-charcoal)]">{item.accountCode}</div>
                                <div className="text-xs text-[var(--color-slate)] truncate max-w-[200px]">{item.accountName}</div>
                              </td>
                              <td>
                                <span className={`badge ${item.role === 'CLIENT' ? 'badge--success' : 'badge--warning'}`}>
                                  {item.role}
                                </span>
                              </td>
                              <td>
                                <div className="font-semibold text-[var(--color-charcoal)]">{item.scriptShortName}</div>
                                <div className="text-[10px] text-[var(--color-slate)]">{item.exchangeCode}</div>
                              </td>
                              <td className="font-mono text-xs text-[var(--color-slate)]">{item.expiry || '—'}</td>
                              <td>
                                <span className={`badge ${action === 'BUY' ? 'badge--success' : 'badge--warning'} font-bold`}>
                                  {action}
                                </span>
                              </td>
                              <td className="text-right font-mono font-medium">{qty.toLocaleString('en-IN')}</td>
                              <td className="text-right font-mono">
                                {hasNoRate ? (
                                  <span className="text-amber-600 flex items-center justify-end gap-1 text-xs font-semibold" title="Please add a closing rate for this script in the database.">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {getSym(item)}0.00 (Missing)
                                  </span>
                                ) : (
                                  `${getSym(item)}${rate.toFixed(2)}`
                                )}
                              </td>
                              <td className="text-right font-mono font-semibold">
                                {getSym(item)}{(qty * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="text-xs font-medium text-[var(--color-charcoal)]">{backForwardDateFormatted}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showScriptModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <ScriptFormModal
            initialData={scriptModalInitialData}
            exchanges={exchanges}
            currencies={currencies}
            onClose={() => setShowScriptModal(false)}
            onSuccess={handleScriptCreated}
          />,
          document.body
        )}

      {/* Settlement Execution Preview Modal */}
      {previewModal?.isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] border border-[var(--color-border-medium)] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-[var(--color-border-light)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                    <Zap className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Settlement Execution Preview</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Period: <strong>{formatDateStr(previewModal.settlementFromDate)}</strong> to <strong>{formatDateStr(previewModal.settlementToDate)}</strong> • {previewModal.unsettledTradesCount} unsettled trades
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60">
                    <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Carry Forward (CF)</div>
                    <div className="text-2xl font-bold text-blue-700 mt-1">
                      {previewModal.preview.filter(p => p.tradeType === 'CARRY_FORWARD').length} trades
                    </div>
                    <div className="text-[11px] text-blue-600 mt-0.5">Closes open positions on {formatDateStr(previewModal.settlementToDate)}</div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Back Forward (BF)</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {previewModal.preview.filter(p => p.tradeType === 'BACK_FORWARD').length} trades
                    </div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">Re-opens position on next day ({getNextDayStr(previewModal.settlementToDate)})</div>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60">
                    <div className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Settlement (Expired)</div>
                    <div className="text-2xl font-bold text-purple-700 mt-1">
                      {previewModal.preview.filter(p => p.tradeType === 'SETTLEMENT').length} trades
                    </div>
                    <div className="text-[11px] text-purple-600 mt-0.5">Final closing trade on expiry date (No BF)</div>
                  </div>
                </div>

                {/* Errors Section */}
                {previewModal.errors.length > 0 && (
                  <div className="border border-rose-200 bg-rose-50/80 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Missing Closing Rates for Settlement ({previewModal.errors.length})
                    </div>
                    <p className="text-xs text-rose-700">
                      The following securities are missing closing rates for this settlement date. Please import or add closing rates before executing settlement.
                    </p>
                    <ul className="list-disc list-inside text-xs text-rose-800 space-y-1 mt-2">
                      {previewModal.errors.map((e, idx) => (
                        <li key={idx}>
                          <strong>{e.securityName}</strong>: {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preview Trades Table */}
                {previewModal.preview.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Generated Adjustment Trades Preview ({previewModal.preview.length})</span>
                      <span className="text-[11px] text-slate-500 font-normal">Auto-calculated using closing rates</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/75 text-slate-600 font-semibold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Client</th>
                            <th className="py-2.5 px-3">Broker</th>
                            <th className="py-2.5 px-3">Security Name</th>
                            <th className="py-2.5 px-3">Action</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Closing Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewModal.preview.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.tradeType === 'CARRY_FORWARD' ? 'bg-blue-100 text-blue-800' :
                                  p.tradeType === 'BACK_FORWARD' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {p.tradeType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{formatDateStr(p.tradeDate)}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{p.accountCode}</td>
                              <td className="py-2.5 px-3 text-slate-600">{p.brokerCode || '—'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">{p.securityName}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  p.transactionType === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {p.transactionType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{p.quantity.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                                {p.currencyCode || '$'}{p.rate.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
                    No open positions require Carry Forward, Back Forward, or Settlement adjustment for this date.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-[var(--color-border-light)] flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Executing will create trades, tag participating records with Settlement ID, and post net amounts to the Ledger.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewModal(null)}
                    className="btn btn--secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExecuteSettlement}
                    disabled={isExecutingSettlement || previewModal.errors.length > 0 || previewModal.preview.length === 0}
                    className="btn btn--primary text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExecutingSettlement ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Executing Settlement...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Confirm & Execute Settlement
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
