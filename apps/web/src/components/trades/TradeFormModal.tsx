'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { calculateTradeRates, type TradeRateResult } from '@/utils/brokerage';
import { validateExpiryAgainstTradeDate, formatDateForInput, formatDateToDDMMYY } from '@/utils/dateUtils';
import { generateSecurityName, formatExpiryToDDMMMYY } from '@/utils/securityName';
import { validateTradeForm } from '@/utils/validators';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Lock, Trash2, ShieldCheck, RotateCcw, Check, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { notify } from '@/utils/toastNotify';
import { apiFetch } from '@/utils/apiClient';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { UniversalDatePicker } from '../ui/UniversalDatePicker';
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
  onSave: (row: any) => void;
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

  // Fetch active brokerage rules for client & broker
  useEffect(() => {
    if (!clientId && !brokerId) {
      setClientRule(null);
      setBrokerRule(null);
      return;
    }

    let active = true;

    const fetchRules = async () => {
      try {
        const clientPromise = clientId
          ? apiFetch(`/brokerages/account/${clientId}`).then((r) => r.ok ? r.json() : null)
          : Promise.resolve(null);

        const brokerPromise = brokerId
          ? apiFetch(`/brokerages/account/${brokerId}`).then((r) => r.ok ? r.json() : null)
          : Promise.resolve(null);

        const [cRule, bRule] = await Promise.all([clientPromise, brokerPromise]);
        if (active) {
          setClientRule(cRule);
          setBrokerRule(bRule);
        }
      } catch (err) {
        console.error('Failed to fetch brokerage rules:', err);
      }
    };

    fetchRules();
    return () => { active = false; };
  }, [clientId, brokerId]);

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
      brokerBrokerage: brokerRule?.brokerage ?? null,
    });

    setCalc(res);
  }, [quantity, marketRate, script, tradeType, clientRule, brokerRule, initialTrade]);

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

    if (expiryDate && date) {
      const expErr = validateExpiryAgainstTradeDate(date, expiryDate);
      if (expErr) errMap.expiryDate = expErr;
    }

    return errMap;
  }, [clientId, scriptId, exchangeId, brokerId, marketRate, quantity, date, expiryDate]);

  const isFormValid = Object.keys(errors).length === 0 && Boolean(scriptId && clientId && brokerId && quantity && marketRate);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSave = async (e?: React.FormEvent) => {
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
      onSave(savedData);

      if (!isEdit) {
        notify.success(`Trade ${savedData.tradeNumber || ''} added successfully!`, {
          description: 'Ready for next trade entry.',
        });
        setQuantity('');
        setMarketRate('');
        setTimeout(() => quantityInputRef.current?.focus(), 50);
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
        className="w-245 max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-slate-200 bg-white rounded-2xl"
      >
        {/* Executive Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-md px-2.5 py-0.5 shadow-2xs">
                #{initialTrade?.tradeNumber || 'New Entry'}
              </span>

              {/* Side Badge or Toggle */}
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200/90">
                <button
                  type="button"
                  onClick={() => handleToggleSide('BUY')}
                  disabled={isLocked}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase transition-all cursor-pointer',
                    isBuy
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  )}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSide('SELL')}
                  disabled={isLocked}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase transition-all cursor-pointer',
                    !isBuy
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-rose-700'
                  )}
                >
                  SELL
                </button>
              </div>

              {isLocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-2 py-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked Record
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3 text-slate-500" /> Active Trade
                </span>
              )}
            </div>

            <h2 className="text-base font-bold text-slate-900 mt-1">
              {!initialTrade ? 'Add New Trade' : isDirty ? 'Edit Trade Details' : 'Trade Specifications'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form
          id="tradeForm"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(e);
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Locked Notification */}
            {isLocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 text-xs animate-in fade-in">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Locked Settlement Record:</span> This trade was processed by a settlement cycle and is locked against modifications or deletion.
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 gap-5">
              {/* Left Column: Trade Specifications & Click-To-Edit Fields */}
              <div className="col-span-12 lg:col-span-7 space-y-4">
                {/* Canonical Security Banner */}
                {liveSecurityName && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 uppercase tracking-wider text-[11px]">Security:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
                      {liveSecurityName}
                    </span>
                  </div>
                )}

                {/* Row 1: Script & Trade Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Script <span className="text-red-500 font-bold">*</span>
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
                        variant={isExistingTrade ? 'seamless' : 'default'}
                        placeholder="Select Script"
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Type <span className="text-red-500 font-bold">*</span>
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
                      variant={isExistingTrade ? 'seamless' : 'default'}
                      placeholder="Select Type"
                      disabled={isLocked}
                    />
                  </div>
                </div>

                {/* Row 2: Date & Expiry date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Trade Date <span className="text-red-500 font-bold">*</span>
                    </label>

                    <div className={cn(touched.tradeDate && errors.tradeDate && 'rounded-lg ring-2 ring-rose-200 border-rose-400')}>
                      <UniversalDatePicker
                        value={date}
                        onChange={(newDate) => {
                          setDate(newDate);
                          handleBlur('tradeDate');
                        }}
                        variant={isExistingTrade ? 'seamless' : 'default'}
                        placeholder="DD-MM-YY"
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Expiry Date
                      </label>
                      {expiryOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomExpiry(!isCustomExpiry)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                        >
                          {isCustomExpiry ? 'Choose from Master' : 'Custom Date...'}
                        </button>
                      )}
                    </div>

                    <div className={cn(touched.expiryDate && errors.expiryDate && 'rounded-lg ring-2 ring-rose-200 border-rose-400')}>
                      {isCustomExpiry || expiryOptions.length === 0 ? (
                        <UniversalDatePicker
                          value={expiryDate}
                          onChange={(newDate) => {
                            setExpiryDate(newDate);
                            handleBlur('expiryDate');
                          }}
                          variant={isExistingTrade ? 'seamless' : 'default'}
                          placeholder="DD-MM-YY"
                          disabled={isLocked}
                        />
                      ) : (
                        <UniversalDropdown
                          value={expiryDate}
                          options={[
                            { value: '', label: 'None / Cash' },
                            ...expiryOptions,
                          ]}
                          onChange={(val) => {
                            setExpiryDate(val);
                            handleBlur('expiryDate');
                          }}
                          variant={isExistingTrade ? 'seamless' : 'default'}
                          placeholder="Select Expiry"
                          disabled={isLocked}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Client & Broker */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Client <span className="text-red-500 font-bold">*</span>
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
                        variant={isExistingTrade ? 'seamless' : 'default'}
                        placeholder="Select Client"
                        disabled={isLocked}
                        searchable={true}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Broker <span className="text-red-500 font-bold">*</span>
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
                        variant={isExistingTrade ? 'seamless' : 'default'}
                        placeholder="Select Broker"
                        disabled={isLocked}
                        searchable={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Quantity & Market Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Quantity <span className="text-red-500 font-bold">*</span>
                    </label>

                    <input
                      ref={quantityInputRef}
                      type="number"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      onBlur={() => handleBlur('quantity')}
                      placeholder="e.g. 100 or -50"
                      disabled={isLocked}
                      className={cn(
                        'w-full min-h-9.5 h-9.5 px-3 text-xs font-mono font-bold rounded-lg border transition-all duration-150 outline-none text-left',
                        isExistingTrade
                          ? 'border-transparent bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-900'
                          : 'border-slate-300 hover:border-slate-400 focus:border-[#2652C8] focus:ring-2 focus:ring-blue-100 bg-white shadow-2xs text-slate-900',
                        isLocked && 'opacity-60 bg-slate-100/50 cursor-not-allowed',
                        touched.quantity && errors.quantity && 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100'
                      )}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Market Rate <span className="text-red-500 font-bold">*</span>
                    </label>

                    <input
                      type="number"
                      step="0.0001"
                      value={marketRate}
                      onChange={(e) => setMarketRate(e.target.value)}
                      onBlur={() => handleBlur('marketRate')}
                      placeholder="0.00"
                      disabled={isLocked}
                      className={cn(
                        'w-full min-h-9.5 h-9.5 px-3 text-xs font-mono font-bold rounded-lg border transition-all duration-150 outline-none text-left',
                        isExistingTrade
                          ? 'border-transparent bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-900'
                          : 'border-slate-300 hover:border-slate-400 focus:border-[#2652C8] focus:ring-2 focus:ring-blue-100 bg-white shadow-2xs text-slate-900',
                        isLocked && 'opacity-60 bg-slate-100/50 cursor-not-allowed',
                        touched.marketRate && errors.rate && 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100'
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Rate & Brokerage Calculation Summary */}
              <div className="col-span-12 lg:col-span-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    Rate &amp; Brokerage Summary
                  </h3>

                  {!displayMetrics ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">
                      Enter quantity and rate to view calculated rates.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {/* Client Rate Card */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                        <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                          <span className="font-semibold uppercase tracking-wider text-[10px]">Client Rate</span>
                          <span className="font-mono text-[11px] text-slate-600">
                            {displayMetrics.clientBrokerage > 0 ? `+${currSym}${displayMetrics.clientBrokerage.toFixed(2)} brk` : '0 brk'}
                          </span>
                        </div>
                        <div className="font-mono text-base font-bold text-slate-900">
                          {currSym}{displayMetrics.clientRate.toFixed(2)}
                        </div>
                      </div>

                      {/* Broker Rate Card */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                        <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                          <span className="font-semibold uppercase tracking-wider text-[10px]">Broker Rate</span>
                          <span className="font-mono text-[11px] text-slate-600">
                            {displayMetrics.brokerBrokerage > 0 ? `+${currSym}${displayMetrics.brokerBrokerage.toFixed(2)} brk` : '0 brk'}
                          </span>
                        </div>
                        <div className="font-mono text-base font-bold text-slate-900">
                          {currSym}{displayMetrics.brokerRate.toFixed(2)}
                        </div>
                      </div>

                      {/* Net Trade Value */}
                      {netTradeValue != null && !isNaN(netTradeValue) && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-[10px] mb-1">
                            Total Net Value
                          </div>
                          <div className="font-mono text-lg font-bold text-[#2652C8]">
                            {currSym}{netTradeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}

                      {/* Trade Volume Metrics */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-600">
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">Side:</span>
                          <span className={cn('font-bold', displayMetrics.side === 'BUY' ? 'text-emerald-700' : 'text-rose-700')}>{displayMetrics.side}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">Lot Size:</span>
                          <span>{displayMetrics.marketLot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-500">Total Units:</span>
                          <span>{displayMetrics.totalUnits.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Footer Bar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
            {/* Left Action: Delete Trade (Only for existing trades) */}
            <div>
              {initialTrade?.id && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  disabled={isLocked || isDeleting}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors',
                    isLocked
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                  )}
                  title={isLocked ? 'Settled trades cannot be deleted' : 'Delete this trade'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Trade</span>
                </button>
              )}
            </div>

            {/* Right Action: Cancel / Discard Changes / Save */}
            <div className="flex items-center gap-2.5">
              {!initialTrade ? (
                // Add New Trade Mode
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn--secondary text-xs px-4 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !isFormValid}
                    className="btn btn--primary flex items-center gap-2 text-xs px-4 py-2 min-w-28 justify-center cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding…</span>
                      </>
                    ) : (
                      'Add Trade'
                    )}
                  </button>
                </>
              ) : isDirty ? (
                // Existing Trade with Dirty Edits
                <>
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="btn btn--secondary flex items-center gap-1.5 text-xs px-4 py-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Discard Changes</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isLocked || !isFormValid}
                    className="btn btn--primary flex items-center gap-2 text-xs px-4 py-2 min-w-28 justify-center cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
                  className="btn btn--secondary text-xs px-5 py-2 cursor-pointer font-semibold"
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
