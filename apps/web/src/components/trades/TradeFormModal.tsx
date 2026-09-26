'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateBrokerage, round, type BrokerageRule, type CalcResult } from '@/utils/brokerage';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function TradeFormModal({
  exchanges,
  scripts,
  clients,
  brokers,
  initialTrade,
  onClose,
  onSave,
}: {
  exchanges: any[];
  scripts: any[];
  clients: any[];
  brokers: any[];
  initialTrade?: any;
  onClose: () => void;
  onSave: (row: any) => void;
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
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

  const [clientRule, setClientRule] = useState<BrokerageRule | null>(null);
  const [brokerRule, setBrokerRule] = useState<BrokerageRule | null>(null);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Derive exchange directly from selected script
  const script = useMemo(() => scripts.find((s) => s.id === scriptId), [scripts, scriptId]);
  const exchangeId = useMemo(
    () => script?.exchangeId || script?.exchange?.id || initialTrade?.exchangeId || initialTrade?.exchange?.id || '',
    [script, initialTrade]
  );
  const exchange = useMemo(
    () => script?.exchange || exchanges.find((e) => e.id === exchangeId),
    [script, exchanges, exchangeId]
  );
  const client = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  const broker = useMemo(() => brokers.find((b) => b.id === brokerId), [brokers, brokerId]);

  const currSym = script?.currency?.symbol || '₹';

  // Fetch brokerage rules whenever client, broker, script, or derived exchange changes
  useEffect(() => {
    if (!exchangeId || !clientId || !brokerId) {
      setClientRule(null);
      setBrokerRule(null);
      return;
    }

    const fetchRules = async () => {
      setIsLoadingRules(true);
      try {
        const scriptQuery = scriptId ? `&scriptId=${scriptId}` : '';
        const [clientRes, brokerRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/brokerages/resolve?accountId=${clientId}&exchangeId=${exchangeId}&appliesTo=CLIENT${scriptQuery}`
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/brokerages/resolve?accountId=${brokerId}&exchangeId=${exchangeId}&appliesTo=BROKER${scriptQuery}`
          ),
        ]);

        const parseSafe = async (res: Response) => {
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

        const resolvedClientRule = clientData && clientData.id ? clientData : null;
        const resolvedBrokerRule = brokerData && brokerData.id ? brokerData : null;

        setClientRule(resolvedClientRule);
        setBrokerRule(resolvedBrokerRule);
      } catch (e) {
        console.error(e);
        setClientRule(null);
        setBrokerRule(null);
      } finally {
        setIsLoadingRules(false);
      }
    };

    fetchRules();
  }, [exchangeId, clientId, brokerId, scriptId]);

  // Live calculation: Non-blocking, defaults to 0 / market rate if rules are not set
  useEffect(() => {
    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');
    if (!qtyNum || !rateNum) {
      setCalc(null);
      return;
    }

    const side: 'BUY' | 'SELL' = qtyNum >= 0 ? 'BUY' : 'SELL';
    const absQuantity = Math.abs(qtyNum);
    const tradeValue = round(absQuantity * rateNum);
    const marketRounded = round(rateNum);

    // Client calculation
    let clientBrokerage = 0;
    let clientPerUnit = 0;
    let clientRate = marketRounded;
    let clientIsFixed = false;
    let clientRuleType: 'AMOUNT' | 'PERCENT' = 'PERCENT';

    if (clientRule) {
      clientRuleType = clientRule.type;
      clientIsFixed = clientRule.type === 'AMOUNT';
      if (!clientIsFixed) {
        clientBrokerage = calculateBrokerage(clientRule, tradeValue, side, 'TRADING');
        clientPerUnit = absQuantity > 0 ? round(clientBrokerage / absQuantity) : 0;
        clientRate = side === 'BUY' ? round(rateNum + clientPerUnit) : round(rateNum - clientPerUnit);
      }
    }

    // Broker calculation
    let brokerBrokerage = 0;
    let brokerPerUnit = 0;
    let brokerRate = marketRounded;
    let brokerIsFixed = false;
    let brokerRuleType: 'AMOUNT' | 'PERCENT' = 'PERCENT';

    if (brokerRule) {
      brokerRuleType = brokerRule.type;
      brokerIsFixed = brokerRule.type === 'AMOUNT';
      if (!brokerIsFixed) {
        brokerBrokerage = calculateBrokerage(brokerRule, tradeValue, side, 'TRADING');
        brokerPerUnit = absQuantity > 0 ? round(brokerBrokerage / absQuantity) : 0;
        brokerRate = side === 'BUY' ? round(rateNum + brokerPerUnit) : round(rateNum - brokerPerUnit);
      }
    }

    // Spread profit
    const profit = side === 'BUY' ? round(clientRate - brokerRate) : round(brokerRate - clientRate);
    const totalProfit = round(profit * absQuantity);

    setCalc({
      side,
      absQuantity,
      tradeValue,
      clientBrokerage,
      clientPerUnit,
      clientRate,
      clientIsFixed,
      clientRuleType,
      brokerBrokerage,
      brokerPerUnit,
      brokerRate,
      brokerIsFixed,
      brokerRuleType,
      profit,
      totalProfit,
    });
  }, [quantity, marketRate, clientRule, brokerRule]);

  const handleSave = async () => {
    if (!script || !client || !broker) return;
    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');
    if (!qtyNum || !rateNum) {
      toast.error('Please enter valid quantity and market rate');
      return;
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
          remarks: initialTrade?.remarks || 'Manual Entry',
          source: initialTrade?.source || 'MANUAL',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save trade');
      }

      toast.success(isEdit ? 'Trade updated successfully' : 'Trade saved successfully');
      onSave(await res.json());
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[980px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-12 gap-5">
            {/* Left: Inputs */}
            <div className="col-span-7 space-y-5">
              {/* Row 1: Script & Trade Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Script</label>
                  <select
                    value={scriptId}
                    onChange={(e) => setScriptId(e.target.value)}
                    className="input text-slate-900"
                    style={{ color: 'var(--color-charcoal)' }}
                  >
                    <option value="" className="text-slate-900">
                      Select Script
                    </option>
                    {scripts.map((s) => {
                      const exCode = s.exchange?.code || s.exchange?.name;
                      return (
                        <option key={s.id} value={s.id} className="text-slate-900">
                          {s.shortName}
                          {exCode ? ` (${exCode})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Type</label>
                  <select
                    value={tradeType}
                    onChange={(e) => setTradeType(e.target.value)}
                    className="input text-slate-900"
                    style={{ color: 'var(--color-charcoal)' }}
                  >
                    <option value="INTERNAL">Internal Trade</option>
                    <option value="CARRY_FORWARD">Carry Forward</option>
                    <option value="BACK_FORWARD">Backforward</option>
                    <option value="SETTLEMENT">Settlement</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Date & Expiry date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Expiry date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="input w-full text-slate-900"
                    style={{ color: 'var(--color-charcoal)' }}
                  />
                </div>
              </div>

              {/* Row 3: Client & Broker */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="input text-slate-900"
                    style={{ color: 'var(--color-charcoal)' }}
                  >
                    <option value="" className="text-slate-900">
                      Select Client
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="text-slate-900">
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Broker</label>
                  <select
                    value={brokerId}
                    onChange={(e) => setBrokerId(e.target.value)}
                    className="input text-slate-900"
                    style={{ color: 'var(--color-charcoal)' }}
                  >
                    <option value="" className="text-slate-900">
                      Select Broker
                    </option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id} className="text-slate-900">
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Quantity & Market Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Quantity</label>
                  <input
                    type="number"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 100 or -50"
                    className="input"
                  />
                  <p className="form-hint">Positive = BUY, Negative = SELL</p>
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
                    ? clientRule.type === 'AMOUNT'
                      ? 'Fixed amount (invoice)'
                      : 'Percentage'
                    : 'Not set'}
                </div>
                <div className="text-xs text-[var(--color-slate)] text-right">
                  <span className="font-semibold text-[var(--color-charcoal)]">Broker rule:</span>{' '}
                  {isLoadingRules
                    ? 'Loading…'
                    : brokerRule
                    ? brokerRule.type === 'AMOUNT'
                      ? 'Fixed amount (invoice)'
                      : 'Percentage'
                    : 'Not set'}
                </div>
              </div>
            </div>

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
                    {/* Non-mandatory warning/note when brokerage rules are not set */}
                    {(!clientRule || !brokerRule) && (
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
                              {!clientRule
                                ? 'Not set'
                                : calc.clientIsFixed
                                ? 'Fixed (invoice)'
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
                              {!brokerRule
                                ? 'Not set'
                                : calc.brokerIsFixed
                                ? 'Fixed (invoice)'
                                : `${currSym}${calc.brokerBrokerage.toFixed(4)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={cn("border rounded-xl p-4",
                      calc.totalProfit > 0 ? 'bg-[var(--color-mist)] border-[var(--color-leaf)]' :
                      calc.totalProfit < 0 ? 'bg-red-50 border-red-200' :
                      'bg-[var(--color-snow)] border-[var(--color-border-light)]'
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-[var(--color-charcoal)]">Profit</span>
                        <span className={cn("font-mono text-lg font-bold",
                          calc.totalProfit > 0 ? 'text-[var(--color-positive)]' :
                          calc.totalProfit < 0 ? 'text-[var(--color-negative)]' :
                          'text-[var(--color-charcoal)]'
                        )}>
                          {calc.totalProfit > 0 ? '+' : ''}{currSym}{calc.totalProfit.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-slate)] mt-1">
                        Trade value {currSym}{calc.tradeValue.toFixed(4)} • per-unit {currSym}{calc.profit.toFixed(4)}
                      </p>
                    </div>
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
            type="button"
            onClick={handleSave}
            className="btn btn--primary"
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? 'Saving…' : initialTrade ? 'Update Trade' : 'Add Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}
