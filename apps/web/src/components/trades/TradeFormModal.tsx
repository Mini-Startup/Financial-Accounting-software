'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { calculateTradeRates, type TradeRateResult } from '@/utils/brokerage';
import { validateExpiryAgainstTradeDate, formatDateForInput } from '@/utils/dateUtils';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, AlertCircle, Lock, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { UniversalDatePicker } from '../ui/UniversalDatePicker';
import { formatCurrencySymbol } from '@/utils/currency';

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function TradeFormModal({
  exchanges: _exchanges = [],
  scripts = [],
  clients = [],
  brokers = [],
  initialTrade,
  onClose,
  onSave,
}: {
  exchanges?: any[];
  scripts?: any[];
  clients?: any[];
  brokers?: any[];
  initialTrade?: any;
  onClose: () => void;
  onSave: (row: any) => void;
}) {
  useScrollLock(true);
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const quantityInputRef = useRef<HTMLInputElement>(null);

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
      ? new Date(initialTrade.tradeDate).toISOString().split('T')[0]
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

  useEffect(() => {
    // Initial setup if needed
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

  // Fetch brokerage rules whenever client, broker, or script changes
  useEffect(() => {
    if (!clientId) {
      setClientRule(null);
      return;
    }

    const fetchRules = async () => {
      setIsLoadingRules(true);
      try {
        const scriptQuery = scriptId ? `&scriptId=${scriptId}` : '';
        const clientRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/brokerages/resolve?accountId=${clientId}&appliesTo=CLIENT${scriptQuery}`
        );

        let brokerRes: Response | null = null;
        if (brokerId) {
          brokerRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/brokerages/resolve?accountId=${brokerId}&appliesTo=BROKER${scriptQuery}`
          );
        }

        const parseSafe = async (res: Response | null) => {
          if (!res) return null;
          const raw = await res.text();
          if (!raw || !raw.trim()) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        };

        const [clientData, brokerData] = await Promise.all([
          parseSafe(clientRes),
          parseSafe(brokerRes),
        ]);

        setClientRule(clientData?.id ? clientData : null);
        setBrokerRule(brokerData?.id ? brokerData : null);
      } catch (e) {
        console.error(e);
        setClientRule(null);
        setBrokerRule(null);
      } finally {
        setIsLoadingRules(false);
      }
    };

    fetchRules();
  }, [clientId, brokerId, scriptId]);

  // Live calculation: Non-blocking
  useEffect(() => {
    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');
    if (!qtyNum || !rateNum) {
      setCalc(null);
      return;
    }

    const side: 'BUY' | 'SELL' = qtyNum >= 0 ? 'BUY' : 'SELL';
    const absQuantity = Math.abs(qtyNum);
    const lot = script?.lotSize || 1;

    const result = calculateTradeRates({
      rate: rateNum,
      quantity: absQuantity,
      marketLot: lot,
      side,
      clientRule: clientRule
        ? {
            quantity: clientRule.quantity,
            brokerage: clientRule.brokerage,
            direction: clientRule.direction,
          }
        : null,
      brokerBrokerage: brokerRule?.brokerage || 0,
      tradeType,
    });

    setCalc(result);
  }, [quantity, marketRate, clientRule, brokerRule, script, tradeType]);

  const handleSave = async () => {
    if (isLocked) {
      toast.error('Settlement-generated trades are locked and cannot be edited');
      return;
    }

    if (!script || !client || !broker) {
      toast.error('Please select Script, Client, and Broker');
      return;
    }

    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');
    if (!qtyNum || !rateNum) {
      toast.error('Please enter valid quantity and market rate');
      return;
    }

    if (!Number.isInteger(qtyNum)) {
      toast.error('Quantity must be a whole number / integer (no decimals)');
      return;
    }

    if (!date || !formatDateForInput(date)) {
      toast.error('Please enter a valid Trade Date (DD-MM-YY)');
      return;
    }

    if (expiryDate) {
      const expNorm = formatDateForInput(expiryDate);
      if (!expNorm) {
        toast.error('Please enter a valid Expiry Date (DD-MM-YY)');
        return;
      }
      const dateErr = validateExpiryAgainstTradeDate(date, expiryDate);
      if (dateErr) {
        toast.error(dateErr);
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
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save trade');
      }

      const savedData = await res.json();
      onSave(savedData);

      if (!isEdit) {
        toast.success(`Trade ${savedData.tradeNumber || ''} added successfully! Ready for next entry.`);
        // Rapid entry persistence: keep scriptId, exchangeId, date, brokerId, tradeType
        setQuantity('');
        setMarketRate('');
        setTimeout(() => quantityInputRef.current?.focus(), 50);
      } else {
        toast.success(`Trade ${savedData.tradeNumber || ''} updated successfully`);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save trade');
    } finally {
      setIsSaving(false);
    }
  };

  const canCalculate = Boolean(scriptId && clientId && brokerId && parseFloat(quantity || '0'));
  const isFormValid = Boolean(
    scriptId &&
    clientId &&
    brokerId &&
    parseFloat(quantity || '0') &&
    parseFloat(marketRate || '0') > 0
  );

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
    >
      <div ref={modalRef} className="card w-[980px] max-w-[95vw] max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)] shrink-0">
          <div>
            <h2 className="card__title">{initialTrade ? 'Edit Trade' : 'Add Trade'}</h2>
            <p className="text-sm text-[var(--color-slate)] mt-1">Fill the form to instantly calculate client rate, broker rate and profit.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="tradeForm" onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-12 gap-5">
            {/* Warning Banner if trade is locked */}
            {isLocked && (
              <div className="col-span-12 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs animate-in fade-in">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Locked Settlement Trade:</span> This trade was automatically generated by settlement or carry-forward processing and cannot be edited or modified.
                </div>
              </div>
            )}

            {/* Left: Inputs */}
            <fieldset disabled={isLocked} className="col-span-7 space-y-5 disabled:opacity-75">
              {/* Row 1: Script & Trade Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Script</label>
                  <UniversalDropdown
                    value={scriptId}
                    options={(scripts || []).map((s) => ({
                      value: s.id,
                      label: `${s.shortName || s.name || s.symbol || 'Unnamed'}${s.exchange?.code ? ` (${s.exchange.code})` : ''}`,
                      sublabel: s.fullName,
                    }))}
                    onChange={(val) => setScriptId(val)}
                    placeholder="Select Script"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Type</label>
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
                  />
                </div>
              </div>

              {/* Row 2: Date & Expiry date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Date</label>
                  <UniversalDatePicker
                    value={date}
                    onChange={(newDate) => setDate(newDate)}
                    placeholder="DD-MM-YY"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Expiry date</label>
                  <UniversalDatePicker
                    value={expiryDate}
                    onChange={(newDate) => setExpiryDate(newDate)}
                    placeholder="DD-MM-YY"
                  />
                </div>
              </div>

              {/* Row 3: Client & Broker */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Client</label>
                  <UniversalDropdown
                    value={clientId}
                    options={(clients || []).map((c) => ({
                      value: c.id,
                      label: `${c.code ? `${c.code} - ` : ''}${c.name || 'Unnamed'}`,
                    }))}
                    onChange={(val) => setClientId(val)}
                    placeholder="Select Client"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Broker</label>
                  <UniversalDropdown
                    value={brokerId}
                    options={(brokers || []).map((b) => ({
                      value: b.id,
                      label: `${b.code ? `${b.code} - ` : ''}${b.name || 'Unnamed'}`,
                    }))}
                    onChange={(val) => setBrokerId(val)}
                    placeholder="Select Broker"
                  />
                </div>
              </div>

              {/* Row 4: Quantity & Market Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Quantity</label>
                  <input
                    ref={quantityInputRef}
                    type="number"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 100 or -50"
                    className="input"
                  />
                  <p className="form-hint">Positive = BUY, Negative = SELL (whole number)</p>
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Market rate</label>
                  <input
                    type="number"
                    step="any"
                    value={marketRate}
                    onChange={(e) => setMarketRate(e.target.value)}
                    placeholder="e.g. 250.50"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-xs text-[var(--color-slate)]">
                  <span className="font-semibold text-[var(--color-charcoal)]">Client rule:</span>{' '}
                  {isLoadingRules
                    ? 'Loading…'
                    : clientRule
                    ? `${currSym}${clientRule.brokerage} / ${clientRule.quantity} qty (${clientRule.direction || 'BOTH'})`
                    : 'Not set'}
                </div>
                <div className="text-xs text-[var(--color-slate)] text-right">
                  <span className="font-semibold text-[var(--color-charcoal)]">Broker rule:</span>{' '}
                  {isLoadingRules
                    ? 'Loading…'
                    : brokerRule
                    ? `${currSym}${brokerRule.brokerage} / ${brokerRule.quantity} qty`
                    : 'From file charges / Not set'}
                </div>
              </div>
            </fieldset>

            {/* Right: Results */}
            <div className="col-span-5">
              <div className="bg-[var(--color-snow)] border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-charcoal)]">Live result</h3>
                  {calc?.side ? (
                    <span className={cn("badge badge--dot", calc.side === 'BUY' ? 'badge--success' : 'badge--error')}>
                      {calc.side}
                    </span>
                  ) : null}
                </div>

                {!canCalculate ? (
                  <div className="text-sm text-[var(--color-fog)] pt-8">
                    Select script, client, broker and enter quantity to calculate.
                  </div>
                ) : isLoadingRules ? (
                  <div className="text-sm text-[var(--color-fog)] pt-8">Loading brokerage rules…</div>
                ) : !calc ? (
                  <div className="text-sm text-[var(--color-fog)] pt-8">Enter market rate to see rates and profit.</div>
                ) : (
                  <div className="space-y-4">
                    {/* Notice for zero-brokerage trade types vs missing rules */}
                    {['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(tradeType) ? (
                      <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-semibold text-emerald-950">Straightforward Rates:</span> Carry Forward / Back Forward / Settlement trades carry <strong className="font-semibold">zero brokerage / commission</strong>. Client rate and broker rate equal market rate directly.
                        </div>
                      </div>
                    ) : (
                      (!clientRule || !brokerRule) && (
                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-semibold text-amber-950">Note:</span> Brokerage for{' '}
                            {!clientRule && !brokerRule
                              ? 'this client and broker is'
                              : !clientRule
                              ? 'this client is'
                              : 'this broker is'}{' '}
                            not set. Remember to set brokerage to get perfect calculation and perfect reports.
                          </div>
                        </div>
                      )
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--bg-card)] border border-[var(--color-border-light)] rounded-xl p-4">
                        <p className="text-[11px] text-[var(--color-slate)] font-semibold uppercase tracking-wide">Client</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-slate)]">Rate</span>
                            <span className="font-mono font-semibold text-[var(--color-charcoal)]">{currSym}{calc.clientRate.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--color-fog)]">Brokerage</span>
                            <span className="font-mono text-[var(--color-slate)]">
                              {['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(tradeType)
                                ? '0.0000 (Waived)'
                                : !clientRule
                                ? 'Not set'
                                : `${currSym}${calc.clientBrokerage.toFixed(4)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[var(--bg-card)] border border-[var(--color-border-light)] rounded-xl p-4">
                        <p className="text-[11px] text-[var(--color-slate)] font-semibold uppercase tracking-wide">Broker</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-slate)]">Rate</span>
                            <span className="font-mono font-semibold text-[var(--color-charcoal)]">{currSym}{calc.brokerRate.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--color-fog)]">Brokerage</span>
                            <span className="font-mono text-[var(--color-slate)]">
                              {['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(tradeType)
                                ? '0.0000 (Waived)'
                                : `${currSym}${calc.brokerBrokerage.toFixed(4)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profit box - commented out as requested */}
                    {/* <div className={cn("border rounded-xl p-4",
                      calc.profitTotal > 0 ? 'bg-[var(--color-mist)] border-[var(--color-leaf)]' :
                      calc.profitTotal < 0 ? 'bg-red-50 border-red-200' :
                      'bg-[var(--color-snow)] border-[var(--color-border-light)]'
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-[var(--color-charcoal)]">Profit</span>
                        <span className={cn("font-mono text-lg font-bold",
                          calc.profitTotal > 0 ? 'text-[var(--color-positive)]' :
                          calc.profitTotal < 0 ? 'text-[var(--color-negative)]' :
                          'text-[var(--color-charcoal)]'
                        )}>
                          {calc.profitTotal > 0 ? '+' : ''}{currSym}{calc.profitTotal.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-slate)] mt-1">
                        Market value {currSym}{calc.marketValue.toFixed(4)} • per-unit {currSym}{calc.profitPerUnit.toFixed(4)}
                      </p>
                    </div> */}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-4 border-t border-[var(--color-border-light)] bg-[var(--color-snow)] flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
            <button
              type="submit"
              form="tradeForm"
              className="btn btn--primary flex items-center gap-2 min-w-[110px] justify-center"
              disabled={isSaving || isLocked || !isFormValid}
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : initialTrade ? (
                'Update Trade'
              ) : (
                'Add Trade'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
