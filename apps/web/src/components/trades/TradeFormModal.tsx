'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { calculateTradeRates, type TradeRateResult } from '@/utils/brokerage';
import { validateExpiryAgainstTradeDate, formatDateForInput, formatDateToDDMMYY } from '@/utils/dateUtils';
import { generateSecurityName, formatExpiryToDDMMMYY } from '@/utils/securityName';
import { validateTradeForm } from '@/utils/validators';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, AlertCircle, Lock, Check, Sparkles, Calendar, Pencil, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';
import { notify } from '@/utils/toastNotify';
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

  // Dual View / Edit Mode
  const [isEditing, setIsEditing] = useState<boolean>(!initialTrade || initialMode === 'edit');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLocked = Boolean(
    initialTrade?.settlementId != null ||
    (initialTrade?.source === 'SYSTEM' && (
      initialTrade?.tradeType === 'CARRY_FORWARD' ||
      initialTrade?.tradeType === 'BACK_FORWARD' ||
      initialTrade?.tradeType === 'SETTLEMENT'
    ))
  );

  const [scriptId, setScriptId] = useState(initialTrade?.scriptId || initialTrade?.script?.id || '');
  const [tradeType, setTradeType] = useState(initialTrade?.tradeType || 'INTERNAL');
  const [date, setDate] = useState(
    initialTrade?.tradeDate
      ? (formatDateForInput(initialTrade.tradeDate) || todayISO())
      : todayISO()
  );
  const [expiryDate, setExpiryDate] = useState(initialTrade?.expiry || '');
  const [quantity, setQuantity] = useState<string>(
    initialTrade?.quantity != null
      ? String(initialTrade.transactionType === 'SELL' ? -Math.abs(initialTrade.quantity) : initialTrade.quantity)
      : ''
  );
  const [clientId, setClientId] = useState(initialTrade?.accountId || initialTrade?.account?.id || '');
  const [brokerId, setBrokerId] = useState(initialTrade?.brokerId || initialTrade?.broker?.id || '');
  const [marketRate, setMarketRate] = useState<string>(
    initialTrade?.rate != null ? String(initialTrade.rate) : ''
  );

  const [expiryList, setExpiryList] = useState<any[]>([]);
  const [isCustomExpiry, setIsCustomExpiry] = useState<boolean>(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchExpiries = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/expiry-dates?activeOnly=true`);
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
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [calc, setCalc] = useState<TradeRateResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Derive exchange directly from selected script
  const script = useMemo(() => (scripts || []).find((s) => s.id === scriptId), [scripts, scriptId]);
  const exchangeId = useMemo(
    () => script?.exchangeId || script?.exchange?.id || initialTrade?.exchangeId || initialTrade?.exchange?.id || '',
    [script, initialTrade]
  );
  const client = useMemo(() => (clients || []).find((c) => c.id === clientId), [clients, clientId]);
  const broker = useMemo(() => (brokers || []).find((b) => b.id === brokerId), [brokers, brokerId]);

  const currSym = formatCurrencySymbol(script?.currency?.symbol, script?.currency?.code);

  const expiryOptions = useMemo(() => {
    return (expiryList || []).map((exp: any) => {
      const dateVal = exp.date || exp.expiryDate;
      const formatted = formatDateToDDMMYY(dateVal);
      const code = formatExpiryToDDMMMYY(dateVal);
      return {
        value: dateVal,
        label: formatted,
        sublabel: code ? `Exchange Code: ${code}` : undefined,
      };
    });
  }, [expiryList]);

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

  // Reset form states back to initial trade
  const handleCancelEdit = () => {
    if (initialTrade) {
      setScriptId(initialTrade?.scriptId || initialTrade?.script?.id || '');
      setTradeType(initialTrade?.tradeType || 'INTERNAL');
      setDate(initialTrade?.tradeDate ? (formatDateForInput(initialTrade.tradeDate) || todayISO()) : todayISO());
      setExpiryDate(initialTrade?.expiry || '');
      setQuantity(
        initialTrade?.quantity != null
          ? String(initialTrade.transactionType === 'SELL' ? -Math.abs(initialTrade.quantity) : initialTrade.quantity)
          : ''
      );
      setClientId(initialTrade?.accountId || initialTrade?.account?.id || '');
      setBrokerId(initialTrade?.brokerId || initialTrade?.broker?.id || '');
      setMarketRate(initialTrade?.rate != null ? String(initialTrade.rate) : '');
      setTouched({});
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  // Fetch active brokerage rules for client & broker
  useEffect(() => {
    if (!clientId && !brokerId) {
      setClientRule(null);
      setBrokerRule(null);
      return;
    }

    let active = true;
    setIsLoadingRules(true);

    const fetchRules = async () => {
      try {
        const clientPromise = clientId
          ? fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages/account/${clientId}`).then((r) => r.ok ? r.json() : null)
          : Promise.resolve(null);

        const brokerPromise = brokerId
          ? fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages/account/${brokerId}`).then((r) => r.ok ? r.json() : null)
          : Promise.resolve(null);

        const [cRule, bRule] = await Promise.all([clientPromise, brokerPromise]);
        if (active) {
          setClientRule(cRule);
          setBrokerRule(bRule);
        }
      } catch (err) {
        console.error('Failed to fetch brokerage rules:', err);
      } finally {
        if (active) setIsLoadingRules(false);
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

  // Instant display numbers fallback: Never leaves right column blank or stuck on "calculating"
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

      notify.error('Please correct the highlighted errors before saving:', {
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
      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_API_URL}/trades/${initialTrade.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/trades`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
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
        setIsEditing(false);
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
        {/* Sleek Financial Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-md px-2.5 py-0.5 shadow-2xs">
                #{initialTrade?.tradeNumber || 'New Entry'}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase',
                  isBuy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                )}
              >
                {isBuy ? 'BUY' : 'SELL'}
              </span>
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
              {!initialTrade ? 'Add New Trade' : isEditing ? 'Edit Trade Details' : 'Trade Specifications'}
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
        <form id="tradeForm" onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Locked Notification */}
            {isLocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs animate-in fade-in">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Locked Settlement Record:</span> This trade was processed by a settlement cycle and is locked against modifications or deletion.
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 gap-5">
              {/* Left Column: Trade Attributes */}
              <div className="col-span-12 lg:col-span-7 space-y-4">
                {/* Canonical Security Banner */}
                {liveSecurityName && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
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
                      Script {isEditing && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {isEditing ? (
                      <>
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
                          placeholder="Select Script"
                          disabled={isLocked}
                        />
                        {touched.scriptId && errors.scriptId && (
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.scriptId}</p>
                        )}
                      </>
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl">
                        <div className="text-sm font-semibold text-slate-900">
                          {script?.shortName || initialTrade?.script?.shortName || '—'}{' '}
                          {script?.exchange?.code && (
                            <span className="text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded ml-1">
                              {script.exchange.code}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-normal truncate mt-0.5">
                          {script?.fullName || initialTrade?.script?.fullName || ''}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Type {isEditing && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {isEditing ? (
                      <UniversalDropdown
                        value={tradeType}
                        options={[
                          { value: 'INTERNAL', label: 'Internal Trade' },
                          { value: 'CARRY_FORWARD', label: 'Carry Forward' },
                          { value: 'BACK_FORWARD', label: 'Backforward' },
                          { value: 'SETTLEMENT', label: 'Settlement' },
                        ]}
                        onChange={(val) => setTradeType(val)}
                        placeholder="Select Type"
                        disabled={isLocked}
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl flex items-center h-15">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {tradeType}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Date & Expiry date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Trade Date {isEditing && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {isEditing ? (
                      <>
                        <UniversalDatePicker
                          value={date}
                          onChange={(newDate) => {
                            setDate(newDate);
                            handleBlur('tradeDate');
                          }}
                          placeholder="DD-MM-YY"
                          disabled={isLocked}
                        />
                        {touched.tradeDate && errors.tradeDate && (
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.tradeDate}</p>
                        )}
                      </>
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl">
                        <div className="text-sm font-mono font-semibold text-slate-900">
                          {formatDateToDDMMYY(date)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Expiry Date
                      </label>
                      {isEditing && expiryOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomExpiry(!isCustomExpiry)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                        >
                          {isCustomExpiry ? 'Choose from Master' : 'Custom Date...'}
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      isCustomExpiry || expiryOptions.length === 0 ? (
                        <UniversalDatePicker
                          value={expiryDate}
                          onChange={(newDate) => {
                            setExpiryDate(newDate);
                            handleBlur('expiryDate');
                          }}
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
                          placeholder="Select Expiry"
                          disabled={isLocked}
                        />
                      )
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl">
                        <div className="text-sm font-mono font-semibold text-slate-900">
                          {formatDateToDDMMYY(expiryDate) || 'None / Cash'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Client & Broker */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Client {isEditing && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {isEditing ? (
                      <>
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
                          placeholder="Select Client"
                          disabled={isLocked}
                          searchable={true}
                        />
                        {touched.clientId && errors.accountId && (
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.accountId}</p>
                        )}
                      </>
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl">
                        <div className="text-sm font-semibold text-slate-900">
                          {client?.code || initialTrade?.account?.code || '—'}
                        </div>
                        <div className="text-xs text-slate-500 font-normal truncate mt-0.5">
                          {client?.name || initialTrade?.account?.name || ''}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Broker {isEditing && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {isEditing ? (
                      <>
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
                          placeholder="Select Broker"
                          disabled={isLocked}
                          searchable={true}
                        />
                        {touched.brokerId && !brokerId && (
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">Broker selection is required.</p>
                        )}
                      </>
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl">
                        <div className="text-sm font-semibold text-slate-900">
                          {broker?.code || initialTrade?.broker?.code || '—'}
                        </div>
                        <div className="text-xs text-slate-500 font-normal truncate mt-0.5">
                          {broker?.name || initialTrade?.broker?.name || ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Quantity & Market Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Quantity {isEditing && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {isEditing ? (
                      <>
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
                            'input text-xs font-mono font-bold',
                            touched.quantity && errors.quantity && 'border-rose-400 focus:border-rose-500 ring-rose-200'
                          )}
                        />
                        {touched.quantity && errors.quantity && (
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.quantity}</p>
                        )}
                      </>
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-bold',
                            isBuy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          )}
                        >
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {Math.abs(parseFloat(quantity) || initialTrade?.quantity || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Market Rate {isEditing && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          step="0.0001"
                          value={marketRate}
                          onChange={(e) => setMarketRate(e.target.value)}
                          onBlur={() => handleBlur('marketRate')}
                          placeholder="0.00"
                          disabled={isLocked}
                          className={cn(
                            'input text-xs font-mono font-bold',
                            touched.marketRate && errors.rate && 'border-rose-400 focus:border-rose-500 ring-rose-200'
                          )}
                        />
                        {touched.marketRate && errors.rate && (
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.rate}</p>
                        )}
                      </>
                    ) : (
                      <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl font-mono font-bold text-sm text-slate-900">
                        {currSym}{parseFloat(marketRate || initialTrade?.rate || 0).toFixed(2)}
                      </div>
                    )}
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
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
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
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
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

                      {/* Trade Volume Metrics */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 font-mono text-slate-600">
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

          {/* Footer Bar with Dynamic Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
            {/* Left: Delete Trade */}
            <div>
              {initialTrade?.id && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  disabled={isLocked || isDeleting}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors',
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

            {/* Right: Cancel / Save or Close / Edit */}
            <div className="flex items-center gap-2.5">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn btn--secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="tradeForm"
                    disabled={isSaving || isLocked || !isFormValid}
                    className="btn btn--primary flex items-center gap-2 text-xs px-4 py-2 min-w-28 justify-center"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : initialTrade ? (
                      'Save Changes'
                    ) : (
                      'Add Trade'
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn--secondary text-xs px-4 py-2"
                  >
                    Close
                  </button>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="btn btn--primary flex items-center gap-1.5 text-xs px-4 py-2"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Trade</span>
                    </button>
                  )}
                </>
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
