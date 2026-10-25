'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UniversalFileUploader } from '../ui/UniversalFileUploader';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { parseTradeFile, parseDubaiTradeFile } from '../../lib/tradeParser';
import type { DubaiParsedTrade } from '../../lib/tradeParser';
import * as XLSX from 'xlsx';
import { FormModal } from '../accounts/FormModal';
import { ScriptFormModal } from '../scripts/ScriptFormModal';
import { ExchangeFormModal } from '../exchanges/ExchangeFormModal';
import { CurrencyFormModal } from '../currencies/CurrencyFormModal';
import { useTradeImport } from './TradeImportContext';
import { generateDubaiSecurityName, cleanScriptFullName } from './tradeImportHelpers';
import { ImportFilterBar, StatusFilterType } from './ImportFilterBar';
import { DubaiPreviewTable } from './DubaiPreviewTable';
import { NormalPreviewTable } from './NormalPreviewTable';
import { ImportResultPanel } from './ImportResultPanel';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import './trades-import.css';

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
    dubaiPreviewRows,
    setDubaiPreviewRows,
    resetImportState,
  } = useTradeImport();

  const isDubaiImport = selectedImportType === 'dubai_trade_fno';

  const [clients, setClients] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [brokerages, setBrokerages] = useState<any[]>([]);
  const [isValidatingMasterData, setIsValidatingMasterData] = useState(false);

  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeModalInitialData, setExchangeModalInitialData] = useState<any>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyModalInitialData, setCurrencyModalInitialData] = useState<any>(null);

  const [dubaiCurrentPage, setDubaiCurrentPage] = useState(1);
  const [dubaiPageSize, setDubaiPageSize] = useState(50);
  const [dubaiDebugSample, setDubaiDebugSample] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState<string>('clientCode');
  const [exactMatch, setExactMatch] = useState(false);
  const [showValidOnly, setShowValidOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');

  const previewRowsRef = useRef<any[]>([]);
  useEffect(() => {
    previewRowsRef.current = previewRows;
  }, [previewRows]);

  useEffect(() => {
    if (step === 'RESULT') {
      resetImportState();
    }
  }, [step, resetImportState]);

  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalInitialData, setClientModalInitialData] = useState<any>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptModalInitialData, setScriptModalInitialData] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load exchanges, brokers, clients, scripts, currencies on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        const exRes = await fetch(`${apiUrl}/exchanges`);
        if (exRes.ok) {
          const exData = await exRes.json();
          setExchanges(exData);
          if (exData.length > 0) {
            setSelectedExchangeId((prev) => prev || exData[0].id);
          }
        }

        const brRes = await fetch(`${apiUrl}/account-masters?group=Sundry Creditors`);
        if (brRes.ok) {
          const brData = await brRes.json();
          setBrokers(brData);
          if (brData.length > 0) {
            setSelectedBrokerId((prev) => prev || brData[0].id);
          }
        }

        const clRes = await fetch(`${apiUrl}/account-masters?group=Sundry Debtors`);
        if (clRes.ok) {
          const clData = await clRes.json();
          setClients(clData);
        }

        const scRes = await fetch(`${apiUrl}/scripts`);
        if (scRes.ok) {
          const scData = await scRes.json();
          setScripts(scData);
        }

        const curRes = await fetch(`${apiUrl}/currencies`);
        if (curRes.ok) {
          const curData = await curRes.json();
          setCurrencies(curData);
        }

        const brkRes = await fetch(`${apiUrl}/brokerages`);
        if (brkRes.ok) {
          const brkData = await brkRes.json();
          setBrokerages(brkData);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
  }, [setSelectedBrokerId, setSelectedExchangeId]);

  const fetchExchanges = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const exRes = await fetch(`${apiUrl}/exchanges`);
      if (exRes.ok) {
        const exData = await exRes.json();
        setExchanges(exData);
      }
    } catch (err) {
      console.error('Failed to fetch exchanges:', err);
    }
  };

  const fetchScripts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const scRes = await fetch(`${apiUrl}/scripts`);
      if (scRes.ok) {
        const scData = await scRes.json();
        setScripts(scData);
      }
    } catch (err) {
      console.error('Failed to fetch scripts:', err);
    }
  };

  const fetchBrokers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const brRes = await fetch(`${apiUrl}/account-masters?group=Sundry Creditors`);
      if (brRes.ok) {
        const brData = await brRes.json();
        setBrokers(brData);
        if (brData.length > 0) {
          const latest = brData[brData.length - 1];
          setSelectedBrokerId(latest.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
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

  const fetchCurrencies = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const curRes = await fetch(`${apiUrl}/currencies`);
      if (curRes.ok) {
        const curData = await curRes.json();
        setCurrencies(curData);
      }
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
    }
  };

  const handleRevalidateAll = async () => {
    setIsValidatingMasterData(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const [exRes, brRes, clRes, scRes, curRes, brkRes] = await Promise.all([
        fetch(`${apiUrl}/exchanges`),
        fetch(`${apiUrl}/account-masters?group=Sundry Creditors`),
        fetch(`${apiUrl}/account-masters?group=Sundry Debtors`),
        fetch(`${apiUrl}/scripts`),
        fetch(`${apiUrl}/currencies`),
        fetch(`${apiUrl}/brokerages`),
      ]);

      if (exRes.ok) setExchanges(await exRes.json());
      if (brRes.ok) setBrokers(await brRes.json());
      if (clRes.ok) setClients(await clRes.json());
      if (scRes.ok) setScripts(await scRes.json());
      if (curRes.ok) setCurrencies(await curRes.json());
      if (brkRes.ok) setBrokerages(await brkRes.json());

      if (!isDubaiImport) {
        handleRevalidate();
      }
      toast.success('Database validation checks updated');
    } catch (err) {
      console.error('Failed to revalidate master data:', err);
      toast.error('Failed to rerun checks');
    } finally {
      setIsValidatingMasterData(false);
    }
  };

  const handleExchangeDoubleClick = (exchangeCode: string) => {
    setExchangeModalInitialData({
      code: exchangeCode.toUpperCase(),
      name: exchangeCode,
    });
    setShowExchangeModal(true);
  };

  const handleCurrencyDoubleClick = (currencyCode: string) => {
    setCurrencyModalInitialData({
      code: (currencyCode || 'USD').toUpperCase(),
      name: (currencyCode || 'USD').toUpperCase(),
    });
    setShowCurrencyModal(true);
  };

  const handleDubaiScriptDoubleClick = (
    tickCode: string,
    securityName: string,
    marketCode: string,
    marketLot?: any,
    currencyCode?: string
  ) => {
    const foundExchange = exchanges.find(
      (ex) => ex.code.toUpperCase() === (marketCode || '').toUpperCase()
    );
    const foundCurrency = currencies.find(
      (c) => c.code.toUpperCase() === (currencyCode || 'USD').toUpperCase()
    );

    const cleanedFullName = cleanScriptFullName(securityName || tickCode);
    const parsedLot = marketLot ? parseFloat(String(marketLot)) : 1;

    setScriptModalInitialData({
      shortName: tickCode.toUpperCase(),
      fullName: cleanedFullName,
      lotSize: parsedLot > 0 ? parsedLot : 1,
      exchangeId: foundExchange ? foundExchange.id : '',
      currencyId: foundCurrency ? foundCurrency.id : '',
      targetExchangeCode: marketCode || '',
      targetCurrencyCode: currencyCode || 'USD',
    });
    setShowScriptModal(true);
  };

  const getDubaiRowValidation = useCallback((row: DubaiParsedTrade) => {
    const errors: string[] = [];
    const client = clients.find((c) => c.code.toUpperCase() === row.clientCode.toUpperCase());
    const script = scripts.find((s) => s.shortName.toUpperCase() === row.tickCode.toUpperCase());

    const resolvedExchange =
      (script?.exchangeId ? exchanges.find((e) => e.id === script.exchangeId) : null) ||
      (script?.exchange ? script.exchange : null) ||
      (script?.scriptExchangeMappings?.[0]?.exchange ? script.scriptExchangeMappings[0].exchange : null) ||
      exchanges.find((e) => e.code.toUpperCase() === row.marketCode.toUpperCase());

    const currencyCode = row.currencyCode || 'USD';
    const currency = currencies.find((c) => c.code.toUpperCase() === currencyCode.toUpperCase());

    if (!client) {
      errors.push(`Client '${row.clientCode}' not found`);
    }
    if (!resolvedExchange) {
      errors.push(`Exchange '${row.marketCode}' not found`);
    }
    if (!script) {
      errors.push(`Script with short name '${row.tickCode}' not found`);
    }
    if (!currency) {
      errors.push(`Currency '${currencyCode}' not found in master database`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      resolvedClientId: client?.id,
      resolvedScriptId: script?.id,
      resolvedExchangeId: resolvedExchange?.id,
      resolvedCurrencyId: currency?.id,
      dealerCode: client?.dealerCode || '-',
    };
  }, [clients, scripts, exchanges, currencies]);

  const processFile = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv') || file.name.endsWith('.txt');

    if (!isExcel && !isCsv) {
      toast.error('Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv, .txt) file.');
      setIsProcessing(false);
      return;
    }

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const csvContent = XLSX.utils.sheet_to_csv(sheet);
          await handleFileRead(csvContent, file.name);
        } catch (err: any) {
          toast.error('Failed to parse Excel file: ' + (err.message || 'Invalid format'));
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read Excel file.');
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
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
    }
  };

  const handleFileRead = async (content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);
    try {
      if (isDubaiImport) {
        const dubaiResult = parseDubaiTradeFile(content);
        if (dubaiResult.trades.length === 0) {
          throw new Error('No valid trade rows found in the Dubai file.');
        }
        const deselectedTrades = dubaiResult.trades.map((t) => ({ ...t, selected: false }));
        setDubaiPreviewRows(deselectedTrades);
        setDubaiDebugSample(dubaiResult.debugSampleCsv || '');
        setDubaiCurrentPage(1);
        setStep('PREVIEW');
        toast.success(`Parsed ${dubaiResult.trades.length} Dubai trade rows.`);

        setIsValidatingMasterData(true);
        setTimeout(async () => {
          await handleRevalidateAll();
        }, 100);

        if (dubaiResult.debugSampleCsv) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            fetch(`${apiUrl}/trade-import/save-debug-sample`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: name, csvContent: dubaiResult.debugSampleCsv }),
            });
          } catch (e) {
            console.error('Failed to save debug sample to backend', e);
          }
        }

        setIsProcessing(false);
        return;
      }

      const parseResult = parseTradeFile(content);
      if (parseResult.trades.length === 0) {
        throw new Error('No valid trade rows found in the file structure.');
      }
      setParsedTrades(parseResult.trades);

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
        selected: false,
      }));

      setPreviewRows(instantPreview);
      setNormalizedRows(instantPreview);
      setStep('PREVIEW');
      toast.success(`Parsed ${parseResult.trades.length} rows. Validating against database…`);

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
      const deselectedPreview = previewData.map((r: any) => ({ ...r, selected: false }));
      setPreviewRows(deselectedPreview);
      setNormalizedRows(deselectedPreview);
      toast.success('Validation complete.');
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file');
      if (step === 'UPLOAD') {
        setFileName('');
      }
    } finally {
      setIsProcessing(false);
    }
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
      setPreviewRows((prev) => {
        const selectionMap = new Map(prev.map((r) => [r.uniqueTradeId || r.tradeNumber, r.selected]));
        return previewData.map((r: any) => ({
          ...r,
          selected: selectionMap.get(r.uniqueTradeId || r.tradeNumber) || false,
        }));
      });
      setNormalizedRows((prev) => {
        const selectionMap = new Map(prev.map((r) => [r.uniqueTradeId || r.tradeNumber, r.selected]));
        return previewData.map((r: any) => ({
          ...r,
          selected: selectionMap.get(r.uniqueTradeId || r.tradeNumber) || false,
        }));
      });
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
      const validRowsToImport = normalizedRows.filter((r) => r.selected === true && r.status === 'Valid');
      if (validRowsToImport.length === 0) {
        toast.error('No selected valid trades found to import. Please select at least one trade.');
        setIsProcessing(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/trade-import/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRowsToImport,
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

  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    phase: string;
  } | null>(null);

  const handleConfirmDubaiImport = async () => {
    setIsProcessing(true);
    setImportProgress({
      current: 0,
      total: 0,
      percentage: 0,
      phase: 'Preparing trade records for bulk insertion...',
    });

    try {
      const activeDubaiRows = dubaiPreviewRows.filter((r) => !r.typeCode.toUpperCase().includes('X'));
      // Only import rows that are selected and pass validation
      const validActiveRows = activeDubaiRows.filter(
        (r) => r.selected === true && getDubaiRowValidation(r).isValid
      );

      if (validActiveRows.length === 0) {
        toast.error('No selected valid trades found to import. Please select at least one trade.');
        setIsProcessing(false);
        setImportProgress(null);
        return;
      }

      const formattedRows = validActiveRows.map((r, idx) => {
        const val = getDubaiRowValidation(r);
        const scriptObj = scripts.find(
          (s) => s.shortName.toUpperCase() === (r.tickCode || '').toUpperCase()
        );
        const generatedSecName = generateDubaiSecurityName(r, scriptObj);

        return {
          tradeNumber: `DUB-${Date.now()}-${idx + 1}`,
          clientCode: r.clientCode,
          scriptCode: r.tickCode,
          scriptShortName: r.tickCode,
          scriptFullName: scriptObj?.fullName || r.securityName || r.tickCode,
          exchange: r.marketCode,
          buySell: (r.buySellFlag || '').toUpperCase().includes('BUY') ? 'BUY' : 'SELL',
          quantity: parseFloat(r.qty) || 0,
          rate: parseFloat(r.price) || 0,
          tradeDate: r.tradeDate,
          status: 'Valid',
          errors: [],
          resolvedAccountId: val.resolvedClientId,
          resolvedScriptId: val.resolvedScriptId,
          resolvedExchangeId: val.resolvedExchangeId,
          terminal: 'DUBAI',
          expiry: r.expiryDate,
          orderId: r.exchOrderId,

          dealerCode: val.dealerCode,
          currencyCode: r.currencyCode,
          securityName: generatedSecName || r.securityName,
          delMonth: r.delMonth,
          marketLot: parseFloat(r.marketLot) || null,
          callPut: r.callPut,
          strikePrice: parseFloat(r.strikePrice) || null,
          bloombergCode: r.bloombergCode,
          mktValue: parseFloat(r.mktValue) || null,
          clnCommission: parseFloat(r.clnCommission) || null,
          clnExCharges: parseFloat(r.clnExCharges) || null,
          clnCharges1: parseFloat(r.clnCharges1) || null,
          clnCharges2: parseFloat(r.clnCharges2) || null,
          vat: parseFloat(r.vat) || null,
        };
      });

      const totalRows = formattedRows.length;
      const CHUNK_SIZE = 500;
      let totalImported = 0;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        const chunk = formattedRows.slice(i, i + CHUNK_SIZE);
        const pct = Math.round((totalImported / totalRows) * 100);

        setImportProgress({
          current: totalImported,
          total: totalRows,
          percentage: pct,
          phase: `Inserting trades into database (${totalImported.toLocaleString()} / ${totalRows.toLocaleString()})...`,
        });

        const res = await fetch(`${apiUrl}/trade-import/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: chunk,
            brokerId: selectedBrokerId,
            exchangeId: selectedExchangeId || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to confirm trade import batch');
        }

        const result = await res.json();
        totalImported += result.importedCount || chunk.length;
      }

      setImportProgress({
        current: totalRows,
        total: totalRows,
        percentage: 100,
        phase: 'Finalizing database transactions...',
      });

      setImportResult({ importedCount: totalImported, failedCount: 0 });
      setStep('RESULT');
      toast.success(`Import complete! Successfully saved ${totalImported.toLocaleString()} trades.`);
    } catch (err: any) {
      toast.error(err.message || 'Error confirming trade import');
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  const handleReset = () => {
    setStep('UPLOAD');
    setFileName('');
    setParsedTrades([]);
    setNormalizedRows([]);
    setPreviewRows([]);
    setDubaiPreviewRows([]);
    setDubaiCurrentPage(1);
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

  const futureRows = previewRows.filter((r) => r.instrumentType?.toUpperCase().startsWith('FUT'));
  const optionRows = previewRows.filter((r) => !r.instrumentType?.toUpperCase().startsWith('FUT'));
  const validRowsCount = previewRows.filter((r) => r.status === 'Valid').length;
  const validFuturesCount = futureRows.filter((r) => r.status === 'Valid').length;
  const invalidFuturesCount = futureRows.filter((r) => r.status === 'Invalid').length;
  const isValidating = previewRows.some((r) => r.status === 'Validating');

  const activeDubaiRows = useMemo(() => {
    return dubaiPreviewRows.filter((r) => !r.typeCode?.toUpperCase().includes('X'));
  }, [dubaiPreviewRows]);

  const validDubaiRowsCount = useMemo(() => {
    return activeDubaiRows.filter((r) => getDubaiRowValidation(r).isValid).length;
  }, [activeDubaiRows, getDubaiRowValidation]);

  const selectedValidDubaiCount = useMemo(() => {
    return activeDubaiRows.filter((r) => r.selected !== false && getDubaiRowValidation(r).isValid).length;
  }, [activeDubaiRows, getDubaiRowValidation]);

  const invalidDubaiRowsCount = activeDubaiRows.length - validDubaiRowsCount;

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6">
        <div>
          <h1 className="text-h2 font-display">Trade Import</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            {step === 'UPLOAD' && 'Upload files exported from your broker (CSV or Excel format).'}
            {step === 'PREVIEW' && `Preview and validate trades from ${fileName} before importing.`}
            {step === 'RESULT' && 'Import complete. Review execution results below.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (step === 'UPLOAD' || step === 'RESULT') && (
            <button
              onClick={() => {
                if (step === 'RESULT') resetImportState();
                onBack();
              }}
              className="btn btn--secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Trades
            </button>
          )}
          {step === 'PREVIEW' && (
            <>
              <button onClick={handleReset} className="btn btn--secondary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Cancel
              </button>
              {isDubaiImport ? (
                <button
                  onClick={handleConfirmDubaiImport}
                  disabled={isProcessing || selectedValidDubaiCount === 0}
                  className="btn btn--primary flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Importing…
                    </>
                  ) : (
                    <>Import {selectedValidDubaiCount} Selected Trades</>
                  )}
                </button>
              ) : (
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
                    <>Import {validRowsCount} Valid Trades</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Top Configuration Panel */}
      <div className="card shadow-md border border-[var(--color-border-light)] p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="form-field">
            <label className="form-label form-label--required flex items-center justify-between">
              <span>Broker Selection</span>
              {!selectedBrokerId && (
                <span className="text-[10px] text-rose-600 font-bold">Required</span>
              )}
            </label>
            <UniversalDropdown
              value={selectedBrokerId}
              options={brokers.map((b) => ({
                value: b.id,
                label: `${b.name} (${b.code})`,
              }))}
              onChange={(val) => setSelectedBrokerId(val)}
              placeholder="Select Broker (Required)"
              disabled={isProcessing}
              onAddClick={() => setShowBrokerModal(true)}
              addLabel="Add Broker"
            />
          </div>

          {!isDubaiImport && (
            <div className="form-field">
              <label className="form-label form-label--required">Exchange Selection</label>
              <UniversalDropdown
                value={selectedExchangeId}
                options={exchanges.map((ex) => ({
                  value: ex.id,
                  label: `${ex.code} ${ex.name ? `(${ex.name})` : ''}`,
                }))}
                onChange={(val) => setSelectedExchangeId(val)}
                placeholder="Select Exchange"
                disabled={isProcessing}
                onAddClick={() => setShowExchangeModal(true)}
                addLabel="Add Exchange"
              />
            </div>
          )}

          <div className="form-field">
            <label className="form-label form-label--required">Import Type</label>
            <UniversalDropdown
              value={selectedImportType}
              options={[
                { value: 'dubai_trade_fno', label: 'Trade FNO (Dubai)' },
              ]}
              onChange={(val) => setSelectedImportType(val as any)}
              disabled={true}
            />
          </div>

          <div>
            <label className="form-label mb-2">Upload Trade File</label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={inputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                }}
                accept=".txt, .csv, .xlsx, .xls"
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="btn btn--secondary flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Browse CSV / Excel</span>
              </label>
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

      {/* Step = UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="max-w-3xl mx-auto py-6">
          <UniversalFileUploader
            onFileSelect={processFile}
            isProcessing={isProcessing}
            fileName={fileName}
            accept=".txt, .csv, .xlsx, .xls"
            title="Drag & Drop your Dubai FNO Trade file here"
            description="Supports CSV, TXT, Excel files. You can also paste clipboard data (Ctrl+V)."
          />
        </div>
      )}

      {/* Step = PREVIEW Validation Status Bar */}
      {step === 'PREVIEW' && (
        <div className="card p-3.5 bg-slate-900 text-white rounded-lg shadow-sm flex items-center justify-between gap-4 border border-slate-800">
          <div className="flex items-center gap-3">
            {isValidatingMasterData ? (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Running database checks & master data validation...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  Validation checks complete: {isDubaiImport ? validDubaiRowsCount : validFuturesCount} valid,{' '}
                  {isDubaiImport ? invalidDubaiRowsCount : invalidFuturesCount} unmapped
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleRevalidateAll}
            disabled={isValidatingMasterData}
            className="btn btn--secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-slate-800 border-slate-700 text-slate-200 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidatingMasterData ? 'animate-spin' : ''}`} />
            <span>Rerun Checks</span>
          </button>
        </div>
      )}

      {/* Step = PREVIEW Filters */}
      {step === 'PREVIEW' && (
        <ImportFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchColumn={searchColumn}
          setSearchColumn={setSearchColumn}
          exactMatch={exactMatch}
          setExactMatch={setExactMatch}
          showValidOnly={showValidOnly}
          setShowValidOnly={setShowValidOnly}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          resetPage={() => setDubaiCurrentPage(1)}
        />
      )}

      {/* Step = PREVIEW Dubai */}
      {step === 'PREVIEW' && isDubaiImport && dubaiPreviewRows.length > 0 && (
        <DubaiPreviewTable
          dubaiPreviewRows={dubaiPreviewRows}
          setDubaiPreviewRows={setDubaiPreviewRows}
          clients={clients}
          exchanges={exchanges}
          scripts={scripts}
          brokerages={brokerages}
          getDubaiRowValidation={getDubaiRowValidation}
          searchQuery={searchQuery}
          searchColumn={searchColumn}
          exactMatch={exactMatch}
          showValidOnly={showValidOnly}
          statusFilter={statusFilter}
          dubaiCurrentPage={dubaiCurrentPage}
          setDubaiCurrentPage={setDubaiCurrentPage}
          dubaiPageSize={dubaiPageSize}
          setDubaiPageSize={setDubaiPageSize}
          dubaiDebugSample={dubaiDebugSample}
          isValidatingMasterData={isValidatingMasterData}
          onDoubleClickClient={handleClientDoubleClick}
          onDoubleClickScript={handleDubaiScriptDoubleClick}
          onDoubleClickExchange={handleExchangeDoubleClick}
          onDoubleClickCurrency={handleCurrencyDoubleClick}
        />
      )}

      {/* Step = PREVIEW Standard F&O */}
      {step === 'PREVIEW' && !isDubaiImport && (
        <NormalPreviewTable
          totalRows={parsedTrades.length}
          validFuturesCount={validFuturesCount}
          invalidFuturesCount={invalidFuturesCount}
          skippedOptionsCount={optionRows.length}
          futureRows={futureRows}
          optionRows={optionRows}
          previewRows={previewRows}
          setPreviewRows={setPreviewRows}
          normalizedRows={normalizedRows}
          setNormalizedRows={setNormalizedRows}
          clients={clients}
          exchanges={exchanges}
          scripts={scripts}
          brokerages={brokerages}
          isProcessing={isProcessing}
          handleRevalidate={handleRevalidate}
          searchQuery={searchQuery}
          searchColumn={searchColumn}
          exactMatch={exactMatch}
          showValidOnly={showValidOnly}
          statusFilter={statusFilter}
          onDoubleClickClient={handleClientDoubleClick}
          onDoubleClickScript={handleDubaiScriptDoubleClick}
        />
      )}

      {/* Step = RESULT */}
      {step === 'RESULT' && importResult && (
        <ImportResultPanel
          importResult={importResult}
          fileName={fileName}
          onReset={handleReset}
          onBack={onBack}
        />
      )}

      {/* Entity Creation Modals */}
      {showBrokerModal &&
        createPortal(
          <FormModal
            entityLabel="Broker"
            groupName="Sundry Creditors"
            accounts={brokers}
            onClose={() => setShowBrokerModal(false)}
            onSuccess={async () => {
              setShowBrokerModal(false);
              await fetchBrokers();
            }}
          />,
          document.body
        )}

      {showClientModal &&
        createPortal(
          <FormModal
            entityLabel="Client"
            groupName="Sundry Debtors"
            initialData={clientModalInitialData}
            accounts={clients}
            onClose={() => setShowClientModal(false)}
            onSuccess={async () => {
              setShowClientModal(false);
              await fetchClients();
              if (!isDubaiImport) handleRevalidate();
            }}
          />,
          document.body
        )}

      {showScriptModal &&
        createPortal(
          <ScriptFormModal
            initialData={scriptModalInitialData}
            exchanges={exchanges}
            currencies={currencies}
            scripts={scripts}
            onClose={() => setShowScriptModal(false)}
            onSuccess={async () => {
              setShowScriptModal(false);
              await fetchScripts();
              await fetchExchanges();
              if (!isDubaiImport) handleRevalidate();
            }}
          />,
          document.body
        )}

      {showExchangeModal &&
        createPortal(
          <ExchangeFormModal
            initialData={exchangeModalInitialData}
            onClose={() => setShowExchangeModal(false)}
            onSuccess={async () => {
              setShowExchangeModal(false);
              await fetchExchanges();
              await fetchScripts();
            }}
          />,
          document.body
        )}

      {showCurrencyModal &&
        createPortal(
          <CurrencyFormModal
            initialData={currencyModalInitialData}
            onClose={() => setShowCurrencyModal(false)}
            onSuccess={async () => {
              setShowCurrencyModal(false);
              await fetchCurrencies();
            }}
          />,
          document.body
        )}

      {importProgress &&
        createPortal(
          <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="card w-[480px] max-w-[92vw] p-6 bg-white shadow-2xl border border-slate-200 rounded-xl space-y-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-800">Importing Trades to Database</h3>
                <p className="text-xs text-slate-500 font-medium">{importProgress.phase}</p>
              </div>

              {/* Progress Bar Container */}
              <div className="space-y-2">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 p-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${importProgress.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono text-slate-600 font-semibold px-1">
                  <span>{importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} rows</span>
                  <span className="text-emerald-700 font-bold">{importProgress.percentage}%</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
