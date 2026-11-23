'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { calculateTradeRates, type TradeRateResult } from '@/utils/brokerage';
import { validateExpiryAgainstTradeDate, formatDateForInput, formatDateToDDMMYY } from '@/utils/dateUtils';
import { generateSecurityName, formatExpiryToDDMMMYY } from '@/utils/securityName';
import { validateTradeForm } from '@/utils/validators';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Lock, Trash2, ShieldCheck, RotateCcw, Check, Sparkles, Loader2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { notify } from '@/utils/toastNotify';
import { apiFetch } from '@/utils/apiClient';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { UniversalDatePicker } from '../ui/UniversalDatePicker';
import { ExpiryDropdown } from '../ui/ExpiryDropdown';
import { formatCurrencySymbol } from '@/utils/currency';
import { ConfirmDialog } from '../ui/ConfirmDialog';

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface TradeFormModalProps {
  exchanges?: any[];
  scripts?: any[];
  clients?: any[];
  brokers?: any[];
  initialTrade?: any;
  initialMode?: 'view' | 'edit';
  onClose: () => void;
  onSave: (row: any, keepOpen?: boolean) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function TradeFormModal({
  exchanges: _exchanges = [],
  scripts = [],
  clients = [],
  brokers = [],
  initialTrade,
  initialMode = 'view',
  onClose,
  onSave,
  onDelete,
}: TradeFormModalProps) {
  useScrollLock(true);
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isLocked = Boolean(
    initialTrade?.settlementId != null ||
    (initialTrade?.source === 'SYSTEM' && (
      initialTrade?.tradeType === 'CARRY_FORWARD' ||
      initialTrade?.tradeType === 'BACK_FORWARD' ||
      initialTrade?.tradeType === 'SETTLEMENT'
    ))
  );

  // Original snapshot for change detection & discard changes
  const originalValues = useMemo(() => {
    return {
      scriptId: initialTrade?.scriptId || initialTrade?.script?.id || '',
      tradeType: initialTrade?.tradeType || 'INTERNAL',
      date: initialTrade?.tradeDate
        ? (formatDateForInput(initialTrade.tradeDate) || todayISO())
        : todayISO(),
      expiryDate: initialTrade?.expiry || '',
      quantity: initialTrade?.quantity != null
        ? String(initialTrade.transactionType === 'SELL' ? -Math.abs(initialTrade.quantity) : initialTrade.quantity)
        : '',
      clientId: initialTrade?.accountId || initialTrade?.account?.id || '',
      brokerId: initialTrade?.brokerId || initialTrade?.broker?.id || '',
      marketRate: initialTrade?.rate != null ? String(initialTrade.rate) : '',
    };
  }, [initialTrade]);

  // Form states
  const [scriptId, setScriptId] = useState(originalValues.scriptId);
  const [tradeType, setTradeType] = useState(originalValues.tradeType);
  const [date, setDate] = useState(originalValues.date);
  const [expiryDate, setExpiryDate] = useState(originalValues.expiryDate);
  const [quantity, setQuantity] = useState(originalValues.quantity);
  const [clientId, setClientId] = useState(originalValues.clientId);
  const [brokerId, setBrokerId] = useState(originalValues.brokerId);
  const [marketRate, setMarketRate] = useState(originalValues.marketRate);

  const [expiryList, setExpiryList] = useState<any[]>([]);
  const [isCustomExpiry, setIsCustomExpiry] = useState<boolean>(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form to original values whenever initialTrade changes
  useEffect(() => {
    setScriptId(originalValues.scriptId);
    setTradeType(originalValues.tradeType);
    setDate(originalValues.date);
    setExpiryDate(originalValues.expiryDate);
    setQuantity(originalValues.quantity);
    setClientId(originalValues.clientId);
    setBrokerId(originalValues.brokerId);
    setMarketRate(originalValues.marketRate);
    setTouched({});
  }, [originalValues]);

  // Fetch active expiry dates
  useEffect(() => {
    const fetchExpiries = async () => {
      try {
        const res = await apiFetch('/expiry-dates?activeOnly=true');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setExpiryList(data);
          }
        }
      } catch (err) {
        console.error('Failed to load active expiry dates:', err);
      }
    };
    fetchExpiries();
  }, []);

  const [clientRule, setClientRule] = useState<any | null>(null);
  const [brokerRule, setBrokerRule] = useState<any | null>(null);
  const [calc, setCalc] = useState<TradeRateResult | null>(null);

  // Derive entities
  const script = useMemo(() => (scripts || []).find((s) => s.id === scriptId), [scripts, scriptId]);
  const exchangeId = useMemo(
    () => script?.exchangeId || script?.exchange?.id || initialTrade?.exchangeId || initialTrade?.exchange?.id || '',
    [script, initialTrade]
  );
  const client = useMemo(() => (clients || []).find((c) => c.id === clientId), [clients, clientId]);
  const broker = useMemo(() => (brokers || []).find((b) => b.id === brokerId), [brokers, brokerId]);

  const currSym = formatCurrencySymbol(script?.currency?.symbol, script?.currency?.code);

  const expiryOptions = useMemo(() => {
    const tradeDateNorm = formatDateForInput(date);
    return (expiryList || [])
      .filter((exp: any) => {
        if (!tradeDateNorm) return true;
        const expDateVal = exp.normalizedDate || exp.date || exp.expiryDate;
        const expNorm = formatDateForInput(expDateVal);
        return Boolean(expNorm && expNorm >= tradeDateNorm);
      })
      .map((exp: any) => {
        const dateVal = exp.date || exp.expiryDate;
        const formatted = formatDateToDDMMYY(dateVal);
        const code = formatExpiryToDDMMMYY(dateVal);
        return {
          value: dateVal,
          label: formatted,
          sublabel: code ? `Exchange Code: ${code}` : undefined,
        };
      });
  }, [expiryList, date]);

  // Auto-select nearest active expiry date when creating a new trade if not already set
  useEffect(() => {
    if (!initialTrade && !expiryDate && expiryOptions.length > 0) {
      setExpiryDate(expiryOptions[0].value);
    }
  }, [initialTrade, expiryDate, expiryOptions]);

  // Live Canonical Security Name Generator
  const liveSecurityName = useMemo(() => {
    if (!script) return initialTrade?.securityName || '';
    return generateSecurityName({
      scriptFullName: script.fullName || script.shortName,
      scriptShortName: script.shortName,
      expiry: expiryDate,
      callPut: initialTrade?.callPut,
      strikePrice: initialTrade?.strikePrice,
    });
  }, [script, expiryDate, initialTrade]);

  // Calculate dirty state
  const isDirty = useMemo(() => {
    if (!initialTrade) return true;
    return (
      scriptId !== originalValues.scriptId ||
      tradeType !== originalValues.tradeType ||
      date !== originalValues.date ||
      expiryDate !== originalValues.expiryDate ||
      quantity !== originalValues.quantity ||
      clientId !== originalValues.clientId ||
      brokerId !== originalValues.brokerId ||
      marketRate !== originalValues.marketRate
    );
  }, [initialTrade, originalValues, scriptId, tradeType, date, expiryDate, quantity, clientId, brokerId, marketRate]);

  // Handle discarding edits
  const handleDiscardChanges = () => {
    setScriptId(originalValues.scriptId);
    setTradeType(originalValues.tradeType);
    setDate(originalValues.date);
    setExpiryDate(originalValues.expiryDate);
    setQuantity(originalValues.quantity);
    setClientId(originalValues.clientId);
    setBrokerId(originalValues.brokerId);
    setMarketRate(originalValues.marketRate);
    setTouched({});
  };

  // Fetch active brokerage rules for client
  useEffect(() => {
    if (!clientId) {
      setClientRule(null);
      return;
    }

    let active = true;

    const fetchRules = async () => {
      try {
        const scriptQuery = scriptId ? `&scriptId=${encodeURIComponent(scriptId)}` : '';
        const res = await apiFetch(`/brokerages/resolve?accountId=${encodeURIComponent(clientId)}&appliesTo=CLIENT${scriptQuery}`);
        if (active) {
          if (res.ok) {
            const data = await res.json();
            setClientRule(data);
          } else {
            setClientRule(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch client brokerage rule:', err);
        if (active) setClientRule(null);
      }
    };

    fetchRules();
    return () => { active = false; };
  }, [clientId, scriptId]);

  // Recalculate Trade Rates dynamically
  useEffect(() => {
    const qtyNum = parseFloat(quantity);
    const rateNum = parseFloat(marketRate);

    if (isNaN(qtyNum) || qtyNum === 0 || isNaN(rateNum) || rateNum <= 0) {
      setCalc(null);
      return;
    }

    const transactionType = qtyNum >= 0 ? 'BUY' : 'SELL';
    const absQty = Math.abs(qtyNum);
    const lot = script?.lotSize || initialTrade?.marketLot || 1;

    const res = calculateTradeRates({
      rate: rateNum,
      quantity: absQty,
      marketLot: lot,
      side: transactionType,
      tradeType,
      clientRule,
      brokerBrokerage: initialTrade?.brokerBrokerage ?? 0,
    });

    setCalc(res);
  }, [quantity, marketRate, script, tradeType, clientRule, initialTrade]);

  // Metrics fallback: always displays stable calculation values
  const displayMetrics = useMemo(() => {
    if (calc) return calc;
    if (!initialTrade) return null;

    const lot = script?.lotSize || initialTrade?.marketLot || 1;
    const parsedQty = parseFloat(quantity);
    const qty = !isNaN(parsedQty) ? Math.abs(parsedQty) : Math.abs(initialTrade?.quantity || 0);
    const totalUnits = qty * lot;
    const side = !isNaN(parsedQty) ? (parsedQty >= 0 ? 'BUY' : 'SELL') : (initialTrade?.transactionType || 'BUY');
    const cRate = initialTrade?.clientRate != null ? Number(initialTrade.clientRate) : (initialTrade?.rate != null ? Number(initialTrade.rate) + (initialTrade.clientBrokerage || 0) : 0);
    const bRate = initialTrade?.brokerRate != null ? Number(initialTrade.brokerRate) : (initialTrade?.rate != null ? Number(initialTrade.rate) + (initialTrade.brokerBrokerage || 0) : 0);

    return {
      clientRate: cRate,
      clientBrokerage: initialTrade?.clientBrokerage || 0,
      brokerRate: bRate,
      brokerBrokerage: initialTrade?.brokerBrokerage || 0,
      side,
      marketLot: lot,
      totalUnits,
    };
  }, [calc, initialTrade, script, quantity]);

  // Total gross/net trade value
  const netTradeValue = useMemo(() => {
    if (!displayMetrics) return null;
    return displayMetrics.totalUnits * displayMetrics.clientRate;
  }, [displayMetrics]);

  // Validation
  const errors = useMemo(() => {
    const qtyNum = parseFloat(quantity);
    const rateNum = parseFloat(marketRate);

    const clientRes = validateTradeForm({
      accountId: clientId || undefined,
      scriptId: scriptId || undefined,
      exchangeId: exchangeId || undefined,
      brokerId: brokerId || undefined,
      rate: isNaN(rateNum) ? 0 : rateNum,
      quantity: isNaN(qtyNum) ? 0 : qtyNum,
      transactionType: qtyNum >= 0 ? 'BUY' : 'SELL',
      tradeDate: date,
    });

    const errMap: Record<string, string> = {};
    if (!clientRes.isValid) {
      Object.assign(errMap, clientRes.errors);
    }

    if (!expiryDate) {
      errMap.expiryDate = 'Expiry date is required';
    } else if (date) {
      const expErr = validateExpiryAgainstTradeDate(date, expiryDate);
      if (expErr) errMap.expiryDate = expErr;
    }

    return errMap;
  }, [clientId, scriptId, exchangeId, brokerId, marketRate, quantity, date, expiryDate]);

  const isFormValid = Object.keys(errors).length === 0 && Boolean(scriptId && clientId && brokerId && quantity && marketRate && expiryDate);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSave = async (e?: React.FormEvent, keepOpen = false) => {
    if (e) e.preventDefault();
    if (isLocked) return;

    setTouched({
      scriptId: true,
      tradeDate: true,
      clientId: true,
      brokerId: true,
      quantity: true,
      marketRate: true,
      expiryDate: true,
    });

    if (!isFormValid) {
      const errorEntries = Object.entries(errors);
      const tradeFieldLabels: Record<string, string> = {
        scriptId: 'Script',
        tradeDate: 'Trade Date',
        clientId: 'Client Account',
        brokerId: 'Broker Account',
        quantity: 'Quantity',
        marketRate: 'Market Rate',
        expiryDate: 'Expiry Date',
      };
      const errorList = errorEntries.map(([key, msg]) => {
        const fieldTitle = tradeFieldLabels[key] || key;
        return `${fieldTitle}: ${msg}`;
      });

      notify.error('Validation Error', {
        description: errorList.length === 1 ? errorList[0] : undefined,
        errors: errorList.length > 1 ? errorList : undefined,
        duration: 7000,
      });

      const firstKey = errorEntries[0]?.[0] || 'trade';
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstKey}"]`) || document.querySelector(`#${firstKey}`);
        if (el) (el as HTMLElement).focus();
      }, 50);
      return;
    }

    const qtyNum = parseFloat(quantity);
    const rateNum = parseFloat(marketRate);

    if (expiryDate && date) {
      const dateErr = validateExpiryAgainstTradeDate(date, expiryDate);
      if (dateErr) {
        notify.error('Invalid Date Configuration', { description: dateErr });
        return;
      }
    }

    setIsSaving(true);
    try {
      const isEdit = Boolean(initialTrade?.id);
      const endpoint = isEdit
        ? `/trades/${initialTrade.id}`
        : `/trades`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeNumber: initialTrade?.tradeNumber || `TRD-${Date.now().toString().slice(-6)}`,
          tradeDate: date,
          tradeType: tradeType,
          expiry: expiryDate || null,
          accountId: clientId,
          brokerId: brokerId,
          scriptId: scriptId,
          exchangeId: exchangeId,
          transactionType: qtyNum >= 0 ? 'BUY' : 'SELL',
          quantity: Math.abs(qtyNum),
          rate: rateNum,
          marketLot: script?.lotSize || 1,
          remarks: initialTrade?.remarks || 'Manual Entry',
          source: initialTrade?.source || 'MANUAL',
          securityName: liveSecurityName || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save trade');
      }

      const savedData = await res.json();
      onSave(savedData, keepOpen);

      if (!isEdit) {
        if (keepOpen) {
          notify.success(`Trade ${savedData.tradeNumber || ''} added successfully!`, {
            description: 'Ready for next trade entry.',
          });
          setQuantity('');
          setMarketRate('');
          setTimeout(() => quantityInputRef.current?.focus(), 50);
        } else {
          notify.success(`Trade ${savedData.tradeNumber || ''} added successfully!`);
          onClose();
        }
      } else {
        notify.success(`Trade ${savedData.tradeNumber || ''} updated successfully`);
        onClose();
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed to save trade');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete trade handler
  const handleDeleteTrade = async () => {
    if (!initialTrade?.id || isLocked) return;
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(initialTrade.id);
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${initialTrade.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to delete trade');
        }
        notify.success(`Trade ${initialTrade.tradeNumber || ''} deleted`);
      }
      setIsConfirmDeleteOpen(false);
      onClose();
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete trade');
    } finally {
      setIsDeleting(false);
    }
  };

  const qtyNumber = parseFloat(quantity);
  const isBuy = !isNaN(qtyNumber) ? qtyNumber >= 0 : (initialTrade?.transactionType !== 'SELL');
  const isExistingTrade = Boolean(initialTrade);

  // Toggle side (BUY <-> SELL) by inverting quantity sign
  const handleToggleSide = (newSide: 'BUY' | 'SELL') => {
    if (isLocked) return;
    const currentAbs = Math.abs(parseFloat(quantity) || 0);
    if (currentAbs === 0) {
      setQuantity(newSide === 'BUY' ? '' : '-');
    } else {
      setQuantity(newSide === 'BUY' ? String(currentAbs) : String(-currentAbs));
    }
    handleBlur('quantity');
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-slate-200/90 bg-white rounded-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Executive Modal Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
              <ArrowUpDown className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  {!initialTrade ? 'Add New Trade' : isDirty ? 'Edit Trade Details' : 'Trade Specifications'}
                </h2>
                {initialTrade?.tradeNumber && (
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-2xs">
                    #{initialTrade.tradeNumber}
                  </span>
                )}
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded px-2 py-0.5">
                    <Lock className="w-3 h-3 text-amber-600" /> Locked Record
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter trade details, execution rates &amp; client/broker assignments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form
          id="tradeForm"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(e, false);
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {/* Locked Notification */}
            {isLocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 text-xs animate-in fade-in">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Locked Settlement Record:</span> This trade was processed by a settlement cycle and is locked against modifications or deletion.
                </div>
              </div>
            )}

            {/* Row 1: Script & Trade Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Script <span className="text-rose-500">*</span>
                </label>
                <div className={cn(touched.scriptId && errors.scriptId && 'rounded-lg ring-2 ring-rose-200 border-rose-400')}>
                  <UniversalDropdown
                    value={scriptId}
                    options={(scripts || []).map((s) => ({
                      value: s.id,
                      label: `${s.shortName || s.name || s.symbol || 'Unnamed'}${s.exchange?.code ? ` (${s.exchange.code})` : ''}`,
                      sublabel: s.fullName,
                    }))}
                    onChange={(val) => {
                      setScriptId(val);
                      handleBlur('scriptId');
                    }}
                    placeholder="Select Script..."
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Trade Type <span className="text-rose-500">*</span>
                </label>
                <UniversalDropdown
                  value={tradeType}
                  options={[
                    { value: 'INTERNAL', label: 'Internal Trade' },
                    { value: 'CARRY_FORWARD', label: 'Carry Forward' },
                    { value: 'BACK_FORWARD', label: 'Backforward' },
                    { value: 'SETTLEMENT', label: 'Settlement' },
                  ]}
                  onChange={(val) => setTradeType(val)}
                  placeholder="Select Type..."
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Row 2: Date & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Trade Date <span className="text-rose-500">*</span>
                </label>
                <div className={cn(touched.tradeDate && errors.tradeDate && 'rounded-lg ring-2 ring-rose-200 border-rose-400')}>
                  <UniversalDatePicker
                    value={date}
                    onChange={(newDate) => {
                      setDate(newDate);
                      handleBlur('tradeDate');
                    }}
                    placeholder="DD-MM-YY"
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Expiry Date <span className="text-rose-500">*</span>
                </label>
                <div className={cn(touched.expiryDate && errors.expiryDate && 'rounded-lg ring-2 ring-rose-200 border-rose-400')}>
                  <ExpiryDropdown
                    value={expiryDate}
                    onChange={(newDate) => {
                      setExpiryDate(newDate);
                      handleBlur('expiryDate');
                    }}
                    tradeDate={date}
                    disabled={isLocked}
                    placeholder="Select Expiry..."
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Client & Broker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Client Account <span className="text-rose-500">*</span>
                </label>
                <div className={cn(touched.clientId && errors.accountId && 'rounded-lg ring-2 ring-rose-200 border-rose-400')}>
                  <UniversalDropdown
                    value={clientId}
                    options={(clients || []).map((c) => ({
                      value: c.id,
                      label: `${c.code ? `${c.code} - ` : ''}${c.name || 'Unnamed'}`,
                    }))}
                    onChange={(val) => {
                      setClientId(val);
                      handleBlur('clientId');
                    }}
                    placeholder="Select Client..."
                    disabled={isLocked}
                    searchable={true}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Broker Account <span className="text-rose-500">*</span>
                </label>
                <div className={cn(touched.brokerId && !brokerId && 'rounded-lg ring-2 ring-rose-200 border-rose-400')}>
                  <UniversalDropdown
                    value={brokerId}
                    options={(brokers || []).map((b) => ({
                      value: b.id,
                      label: `${b.code ? `${b.code} - ` : ''}${b.name || 'Unnamed'}`,
                    }))}
                    onChange={(val) => {
                      setBrokerId(val);
                      handleBlur('brokerId');
                    }}
                    placeholder="Select Broker..."
                    disabled={isLocked}
                    searchable={true}
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Side & Quantity + Market Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Side &amp; Quantity <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-lg border border-slate-200/90 gap-1 h-10 select-none w-36 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSide('BUY')}
                      disabled={isLocked}
                      className={cn(
                        'text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center',
                        isBuy
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-700 hover:bg-white/50'
                      )}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSide('SELL')}
                      disabled={isLocked}
                      className={cn(
                        'text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center',
                        !isBuy
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-rose-700 hover:bg-white/50'
                      )}
                    >
                      SELL
                    </button>
                  </div>
                  <input
                    ref={quantityInputRef}
                    type="number"
                    step="1"
                    min="1"
                    value={quantity ? Math.abs(parseFloat(quantity)) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setQuantity(isBuy ? '' : '-');
                      } else {
                        const num = Math.abs(parseFloat(val));
                        setQuantity(isBuy ? String(num) : String(-num));
                      }
                    }}
                    onBlur={() => handleBlur('quantity')}
                    placeholder="Qty"
                    disabled={isLocked}
                    className={cn(
                      'w-full h-10 px-3.5 text-sm font-mono font-bold rounded-lg border transition-all duration-150 outline-none',
                      touched.quantity && errors.quantity
                        ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                        : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15',
                      isLocked && 'opacity-60 bg-slate-100/50 cursor-not-allowed'
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Market Rate <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400 select-none">
                    {currSym}
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={marketRate}
                    onChange={(e) => setMarketRate(e.target.value)}
                    onBlur={() => handleBlur('marketRate')}
                    placeholder="0.00"
                    disabled={isLocked}
                    className={cn(
                      'w-full h-10 pl-8 pr-3.5 text-sm font-mono font-bold rounded-lg border transition-all duration-150 outline-none',
                      touched.marketRate && errors.rate
                        ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                        : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15',
                      isLocked && 'opacity-60 bg-slate-100/50 cursor-not-allowed'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Canonical Security Banner */}
            {liveSecurityName && (
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] shrink-0">Security:</span>
                  <span className="font-mono font-bold text-slate-900 truncate">
                    {liveSecurityName}
                  </span>
                </div>
                <span className="text-[10px] bg-blue-50 text-[#2652C8] px-2 py-0.5 rounded border border-blue-200/60 font-semibold font-sans shrink-0 ml-2">
                  Canonical
                </span>
              </div>
            )}

            {/* Calculated Rate & Execution Summary */}
            {displayMetrics && (
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Calculated Rates &amp; Execution</span>
                  <span className="font-mono font-normal normal-case text-slate-400">
                    {displayMetrics.side} • Lot: {displayMetrics.marketLot} • {displayMetrics.totalUnits.toLocaleString()} units
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Client Rate</div>
                    <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                      {currSym}{displayMetrics.clientRate.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {displayMetrics.clientBrokerage > 0 ? `+${currSym}${displayMetrics.clientBrokerage.toFixed(2)} brk` : '0 brk'}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Broker Rate</div>
                    <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                      {currSym}{displayMetrics.brokerRate.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {displayMetrics.brokerBrokerage > 0 ? `+${currSym}${displayMetrics.brokerBrokerage.toFixed(2)} brk` : '0 brk'}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total Value</div>
                    <div className="font-mono text-sm font-bold text-[#2652C8] mt-0.5">
                      {currSym}{netTradeValue ? netTradeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Net Trade Value
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Footer Bar */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0 rounded-b-2xl">
            {/* Left Action: Delete Trade (Only for existing trades) */}
            <div>
              {initialTrade?.id && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  disabled={isLocked || isDeleting}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer',
                    isLocked
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 active:scale-[0.98]'
                  )}
                  title={isLocked ? 'Settled trades cannot be deleted' : 'Delete this trade'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* Right Action: Cancel / Discard Changes / Save */}
            <div className="flex items-center gap-2.5">
              {!initialTrade ? (
                // Add New Trade Mode: Dual Action Buttons
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 px-4 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 shadow-2xs cursor-pointer active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(undefined, true)}
                    disabled={isSaving || !isFormValid}
                    className="h-9 px-4 text-xs font-semibold rounded-lg text-[#2652C8] bg-blue-50 hover:bg-blue-100/80 border border-blue-200 hover:-translate-y-0.5 transition-all duration-150 shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    <span>Save &amp; Add More</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !isFormValid}
                    className="h-9 px-5 text-xs font-semibold rounded-lg text-white bg-[#2652C8] hover:bg-[#1E42A8] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150 shadow-xs flex items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      'Save Trade'
                    )}
                  </button>
                </>
              ) : isDirty ? (
                // Existing Trade with Dirty Edits
                <>
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="h-9 px-4 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 shadow-2xs cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Discard</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isLocked || !isFormValid}
                    className="h-9 px-5 text-xs font-semibold rounded-lg text-white bg-[#2652C8] hover:bg-[#1E42A8] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150 shadow-xs flex items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                // Existing Trade with Clean / Unchanged View
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all duration-150 shadow-2xs cursor-pointer active:scale-[0.98]"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Delete Trade"
        message={
          <div>
            <p>Are you sure you want to delete trade <strong className="font-mono">{initialTrade?.tradeNumber}</strong>?</p>
            <p className="text-xs text-slate-500 mt-2">
              This trade will be soft-deleted and removed from live position calculations.
            </p>
          </div>
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Trade'}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteTrade}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
}
