'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { UniversalFileUploader } from '../ui/UniversalFileUploader';
import { notify } from '../../utils/toastNotify';
import { ArrowLeft, RefreshCw, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  parseTradeFile,
  parseTradesWithDynamicTemplate,
  parseDubaiTradeFile,
  validateTradeImportFile,
  type FileValidationResult,
  type DubaiParsedTrade,
} from '../../lib/tradeParser';
import {
  detectFileTemplate,
  fetchFileImportTemplates,
  DEFAULT_TRADE_TEMPLATES,
  type FileImportTemplateOption,
} from '../../lib/tradeParser/templateDetector';
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
import { apiFetch } from '../../utils/apiClient';
import './trades-import.css';

export function TradeImportManager({ onBack, initialFile }: { onBack?: () => void; initialFile?: File | null }) {
  const router = useRouter();
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
    selectedTemplateCode,
    setSelectedTemplateCode,
    detectedTemplate,
    setDetectedTemplate,
    dubaiPreviewRows,
    setDubaiPreviewRows,
    resetImportState,
  } = useTradeImport();

  const [tradeTemplates, setTradeTemplates] = useState<FileImportTemplateOption[]>(DEFAULT_TRADE_TEMPLATES);
  const isDubaiImport = selectedTemplateCode === 'DUBAI_FNO_TRADE' || selectedTemplateCode === 'ELEC_TRADE' || selectedImportType === 'dubai_trade_fno';

  // Load trade templates on mount
  useEffect(() => {
    fetchFileImportTemplates('TRADE').then((data) => {
      if (data && data.length > 0) setTradeTemplates(data);
    });
  }, []);

  const [clients, setClients] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [brokerages, setBrokerages] = useState<any[]>([]);
  const [isLoadingBrokers, setIsLoadingBrokers] = useState(true);
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
  const [fileValidationError, setFileValidationError] = useState<FileValidationResult | null>(null);

  const handleClearFile = () => {
    setFileValidationError(null);
    resetImportState();
  };

  // Automatically start parsing if an initial file was dragged & dropped from the page
  useEffect(() => {
    if (initialFile && step === 'UPLOAD') {
      processFile(initialFile);
    }
  }, [initialFile]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load exchanges, brokers, clients, scripts, currencies on mount concurrently
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        // Fast-path for brokers: fire immediately
        apiFetch('/account-masters?group=Sundry Creditors')
          .then(async (res) => {
            if (res.ok && isMounted) {
              const brData = await res.json();
              if (Array.isArray(brData)) {
                setBrokers(brData);
                if (brData.length > 0) {
                  setSelectedBrokerId((prev) => prev || brData[0].id);
                }
              }
            }
          })
          .catch((err) => console.error('Failed to fetch brokers:', err))
          .finally(() => {
            if (isMounted) setIsLoadingBrokers(false);
          });

        // Parallel fetch for remaining master data
        const [exRes, clRes, scRes, curRes, brkRes] = await Promise.all([
          apiFetch('/exchanges'),
          apiFetch('/account-masters?group=Sundry Debtors'),
          apiFetch('/scripts'),
          apiFetch('/currencies'),
          apiFetch('/brokerages'),
        ]);

        if (!isMounted) return;

        if (exRes.ok) {
          const exData = await exRes.json();
          setExchanges(exData);
          if (exData.length > 0) {
            setSelectedExchangeId((prev) => prev || exData[0].id);
          }
        }

        if (clRes.ok) {
          const clData = await clRes.json();
          setClients(clData);
        }

        if (scRes.ok) {
          const scData = await scRes.json();
          setScripts(scData);
        }

        if (curRes.ok) {
          const curData = await curRes.json();
          setCurrencies(curData);
        }

        if (brkRes.ok) {
          const brkData = await brkRes.json();
          setBrokerages(brkData);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [setSelectedBrokerId, setSelectedExchangeId]);

  const fetchExchanges = async () => {
    try {
      const exRes = await apiFetch('/exchanges');
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
      const scRes = await apiFetch('/scripts');
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
      setIsLoadingBrokers(true);
      const brRes = await apiFetch('/account-masters?group=Sundry Creditors');
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
    } finally {
      setIsLoadingBrokers(false);
    }
  };

  const fetchClients = async () => {
    try {
      const clRes = await apiFetch('/account-masters?group=Sundry Debtors');
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
      const curRes = await apiFetch('/currencies');
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
      const [exRes, brRes, clRes, scRes, curRes, brkRes] = await Promise.all([
        apiFetch('/exchanges'),
        apiFetch('/account-masters?group=Sundry Creditors'),
        apiFetch('/account-masters?group=Sundry Debtors'),
        apiFetch('/scripts'),
        apiFetch('/currencies'),
        apiFetch('/brokerages'),
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
      notify.success('Validation Updated', { description: 'Database validation checks updated.' });
    } catch (err) {
      console.error('Failed to revalidate master data:', err);
      notify.error('Validation Check Failed', { description: 'Failed to rerun checks.' });
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
      notify.error('Unsupported File Format', { description: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv, .txt) file.' });
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
          notify.error('File Parsing Failed', { description: 'Failed to parse Excel file: ' + (err.message || 'Invalid format') });
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        notify.error('File Read Error', { description: 'Failed to read Excel file.' });
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
        notify.error('File Read Error', { description: 'Failed to read the file.' });
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }
  };

  const handleFileRead = async (content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);
    setFileValidationError(null);

    // ── Auto-Detect Template if in AUTO mode ──
    let activeTemplate = tradeTemplates.find((t) => t.code === selectedTemplateCode);
    let activeCode = selectedTemplateCode;
    if (selectedTemplateCode === 'AUTO') {
      const matched = detectFileTemplate(content, tradeTemplates);
      if (matched) {
        activeTemplate = matched;
        activeCode = matched.code;
        setSelectedTemplateCode(matched.code);
        setDetectedTemplate(matched);
        if (matched.code === 'DUBAI_FNO_TRADE' || matched.code === 'ELEC_TRADE') {
          setSelectedImportType('dubai_trade_fno');
        }
        notify.info('Template Auto-Detected', {
          description: `Using template: ${matched.name}`,
        });
      } else {
        activeTemplate = tradeTemplates[0];
        activeCode = tradeTemplates[0]?.code || 'DUBAI_FNO_TRADE';
        setSelectedTemplateCode(activeCode);
      }
    }

    // ── Pre-Parse File Validation Layer ──
    const validation = validateTradeImportFile(content, activeTemplate);
    if (!validation.isValid) {
      setFileValidationError(validation);
      notify.error(validation.isCrossFileMismatch ? 'Wrong File Uploaded' : 'Invalid Trade File Format', {
        description: validation.errors[0] || 'File format does not match Trade file schema.',
        duration: 8000,
      });
      setIsProcessing(false);
      return;
    }

    try {
      const isDynamicTrade = Boolean(activeTemplate) || activeCode === 'DUBAI_FNO_TRADE' || activeCode === 'ELEC_TRADE' || isDubaiImport;
      if (isDynamicTrade) {
        const tradeResult = parseTradesWithDynamicTemplate(content, activeTemplate);
        if (tradeResult.trades.length === 0) {
          throw new Error('No valid trade rows found in the file.');
        }
        const deselectedTrades = tradeResult.trades.map((t) => ({ ...t, selected: false }));
        setDubaiPreviewRows(deselectedTrades);
        setDubaiDebugSample(tradeResult.debugSampleCsv || '');
        setDubaiCurrentPage(1);
        setStep('PREVIEW');
        const skipMsg = tradeResult.skippedOptionsCount ? ` (${tradeResult.skippedOptionsCount.toLocaleString()} Options trades excluded)` : '';
        notify.success('Trades Parsed', { description: `Successfully parsed ${tradeResult.trades.length.toLocaleString()} Futures trades.${skipMsg}` });

        setIsValidatingMasterData(true);
        setTimeout(async () => {
          await handleRevalidateAll();
        }, 100);

        if (tradeResult.debugSampleCsv) {
          try {
            apiFetch('/trade-import/save-debug-sample', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: name, csvContent: tradeResult.debugSampleCsv }),
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
      notify.success('Trades Parsed', { description: `Parsed ${parseResult.trades.length} rows. Validating against database…` });

      const previewRes = await apiFetch('/trade-import/preview', {
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
      notify.success('Validation Complete', { description: 'All trade records checked against master data.' });
    } catch (err: any) {
      notify.error('Upload Error', { description: err.message || 'Error uploading file' });
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

      const previewRes = await apiFetch('/trade-import/preview', {
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
      notify.success('Validation Updated', { description: 'Validation updated with latest database records.' });
    } catch (err: any) {
      notify.error('Re-validation Failed', { description: err.message || 'Error re-validating trades' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    try {
      const validRowsToImport = normalizedRows.filter((r) => r.selected === true && r.status === 'Valid');
      if (validRowsToImport.length === 0) {
        notify.error('Selection Required', { description: 'No selected valid trades found to import. Please select at least one trade.' });
        setIsProcessing(false);
        return;
      }

      const res = await apiFetch('/trade-import/confirm', {
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
      notify.success('Import Completed', { description: `Successfully created ${result.importedCount} trades.` });
    } catch (err: any) {
      notify.error('Import Failed', { description: err.message || 'Error confirming import' });
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
        notify.error('Selection Required', { description: 'No selected valid trades found to import. Please select at least one trade.' });
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
          substituteClientCode: r.substituteClientCode,
          remarks: r.substituteClientCode ? `Imported via ${r.substituteClientCode}` : 'Imported via Trade_FnO wizard',
        };
      });

      const totalRows = formattedRows.length;
      const CHUNK_SIZE = 500;
      let totalImported = 0;

      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        const chunk = formattedRows.slice(i, i + CHUNK_SIZE);
        const pct = Math.round((totalImported / totalRows) * 100);

        setImportProgress({
          current: totalImported,
          total: totalRows,
          percentage: pct,
          phase: `Inserting trades into database (${totalImported.toLocaleString()} / ${totalRows.toLocaleString()})...`,
        });

        const res = await apiFetch('/trade-import/confirm', {
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
      notify.success('Import Complete', { description: `Successfully saved ${totalImported.toLocaleString()} trades. Redirecting to trades...` });
      setTimeout(() => {
        router.push('/trades');
        router.refresh();
      }, 500);
    } catch (err: any) {
      notify.error('Import Failed', { description: err.message || 'Error confirming trade import' });
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
    <div className="p-2 md:p-4 max-w-full mx-auto space-y-5">
      {/* Action Bar for Preview Step: Executive Control Bar with File Pill, Inline Broker Switcher, and Actions */}
      {step === 'PREVIEW' && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Left: Active File Pill */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2652C8]">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono font-bold text-slate-900 truncate max-w-[200px]" title={fileName}>
                {fileName}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-semibold">
                {(isDubaiImport ? dubaiPreviewRows.length : parsedTrades.length).toLocaleString()} rows
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] flex items-center gap-1">
                {detectedTemplate?.name || tradeTemplates.find((t) => t.code === selectedTemplateCode)?.name || (isDubaiImport ? 'Dubai F&O' : 'Standard')}
                {detectedTemplate && (
                  <span className="text-[9px] bg-emerald-200/70 text-emerald-800 font-semibold px-1 rounded">
                    Auto
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Center: Inline Broker Selector Dropdown for Processed Data */}
          <div className="flex items-center gap-2 bg-slate-50/90 px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Broker:
            </span>
            <div className="w-48 sm:w-56">
              <UniversalDropdown
                value={selectedBrokerId}
                loading={isLoadingBrokers}
                options={brokers.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.code})`,
                }))}
                onChange={(val) => {
                  setSelectedBrokerId(val);
                  notify.success('Broker Updated', { description: 'Target broker updated for this import.' });
                }}
                placeholder="Select Broker..."
                disabled={isProcessing || isLoadingBrokers}
                onAddClick={() => setShowBrokerModal(true)}
                addLabel="Add Broker"
              />
            </div>
          </div>

          {/* Right: Cancel & Import Action Buttons */}
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Cancel</span>
            </button>
            {isDubaiImport ? (
              <button
                onClick={handleConfirmDubaiImport}
                disabled={isProcessing || selectedValidDubaiCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2652C8] hover:bg-[#1E40AF] text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Import {selectedValidDubaiCount.toLocaleString()} Selected Trades</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirmImport}
                disabled={validRowsCount === 0 || isProcessing || isValidating}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2652C8] hover:bg-[#1E40AF] text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing…</span>
                  </>
                ) : isValidating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Import {validRowsCount.toLocaleString()} Valid Trades</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step = UPLOAD Configuration & File Dropzone (Intelligent, compact single card) */}
      {step === 'UPLOAD' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="form-field">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    Select Broker <span className="text-rose-500">*</span>
                    {isLoadingBrokers && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                  </span>
                  {!selectedBrokerId && !isLoadingBrokers && (
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Required</span>
                  )}
                </label>
                <UniversalDropdown
                  value={selectedBrokerId}
                  loading={isLoadingBrokers}
                  options={brokers.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`,
                  }))}
                  onChange={(val) => setSelectedBrokerId(val)}
                  placeholder="Select Broker for Settlement..."
                  disabled={isProcessing || isLoadingBrokers}
                  onAddClick={() => setShowBrokerModal(true)}
                  addLabel="Add Broker"
                />
              </div>

              <div className="form-field">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span>Trade Format / Template</span>
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
                    ...tradeTemplates.map((t) => ({
                      value: t.code,
                      label: `${t.name} (${t.code})`,
                    })),
                  ]}
                  onChange={(val) => {
                    setSelectedTemplateCode(val);
                    if (val === 'AUTO') {
                      setDetectedTemplate(null);
                    } else {
                      const found = tradeTemplates.find((t) => t.code === val);
                      if (found) setDetectedTemplate(found);
                      if (val === 'DUBAI_FNO_TRADE' || val === 'ELEC_TRADE') {
                        setSelectedImportType('dubai_trade_fno');
                      }
                    }
                  }}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Direct File Dropzone / Selected File Card */}
            <div className="pt-2">
              <UniversalFileUploader
                onFileSelect={processFile}
                onClear={handleClearFile}
                isProcessing={isProcessing}
                fileName={fileName}
                isInvalid={Boolean(fileValidationError)}
                accept=".txt, .csv, .xlsx, .xls"
                title="Select or drop trade file"
                description="Supports CSV, TXT, Excel files (.xlsx, .xls) up to 25MB."
              />
            </div>
          </div>
        </div>
      )}

      {/* Step = PREVIEW Executive KPI Stat Strip (Dashboard Double-Bezel Architecture) */}
      {step === 'PREVIEW' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Trades in File */}
          <div className="bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
            <div className="bg-white p-4 rounded-[calc(1rem-0.375rem)] border border-slate-100 flex items-center justify-between h-full">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total File Trades
                </div>
                <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
                  {(isDubaiImport ? dubaiPreviewRows.length : parsedTrades.length).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {isDubaiImport ? (
                    <span>
                      <strong className="text-slate-800 font-semibold">{activeDubaiRows.length}</strong> active •{' '}
                      <strong className="text-rose-600 font-semibold">{dubaiPreviewRows.length - activeDubaiRows.length}</strong> excluded (X)
                    </span>
                  ) : (
                    <span className="truncate max-w-[160px] inline-block font-mono">{fileName}</span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#2652C8]">
                <FileSpreadsheet className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
          </div>

          {/* Card 2: Valid & Ready */}
          <div className="bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
            <div className="bg-white p-4 rounded-[calc(1rem-0.375rem)] border border-slate-100 flex items-center justify-between h-full">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Valid &amp; Ready
                </div>
                <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
                  {(isDubaiImport ? validDubaiRowsCount : validFuturesCount).toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-600/90 mt-1 font-medium">
                  Ready for ledger commit
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Card 3: Unmapped Entities */}
          <div className="bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
            <div className="bg-white p-4 rounded-[calc(1rem-0.375rem)] border border-slate-100 flex items-center justify-between h-full">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                  Unmapped Entities
                </div>
                <div className="text-2xl font-extrabold font-mono text-amber-700 mt-1">
                  {(isDubaiImport ? invalidDubaiRowsCount : invalidFuturesCount).toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-700/80 mt-1 font-medium">
                  Requires client / script mapping
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Card 4: Database Validation Status */}
          <div className="bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
            <div className="bg-white p-4 rounded-[calc(1rem-0.375rem)] border border-slate-100 flex items-center justify-between h-full">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Database Check
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${isValidatingMasterData ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="text-sm font-bold text-slate-900">
                    {isValidatingMasterData ? 'Verifying DB...' : 'Up to Date'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRevalidateAll}
                  disabled={isValidatingMasterData}
                  className="text-[11px] font-semibold text-[#2652C8] hover:text-[#1F42A3] inline-flex items-center gap-1.5 cursor-pointer transition-colors mt-0.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isValidatingMasterData ? 'animate-spin' : ''}`} />
                  <span>Rerun Checks</span>
                </button>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>
          </div>
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
          <div className="fixed inset-0 z-200000 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="card w-120 max-w-[92vw] p-6 bg-white shadow-2xl border border-slate-200 rounded-xl space-y-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-800">Importing Trades to Database</h3>
                <p className="text-xs text-slate-500 font-medium">{importProgress.phase}</p>
              </div>

              {/* Progress Bar Container */}
              <div className="space-y-2">
                <div className="w-full h-3 bg-slate-100 rounded-md overflow-hidden border border-slate-200/80 p-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-md transition-all duration-300 ease-out"
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
