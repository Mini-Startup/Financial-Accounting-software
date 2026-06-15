'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateTrade, type BrokerageRule, type CalcResult } from '@/utils/brokerage';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';
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
  onClose,
  onSave,
}: {
  exchanges: any[];
  scripts: any[];
  clients: any[];
  brokers: any[];
  onClose: () => void;
  onSave: (row: any) => void;
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [exchangeId, setExchangeId] = useState('');
  const [tradeType, setTradeType] = useState('INTERNAL');
  const [date, setDate] = useState(todayISO());
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [scriptId, setScriptId] = useState('');
  const [clientId, setClientId] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [marketRate, setMarketRate] = useState<string>('');

  const [clientRule, setClientRule] = useState<BrokerageRule | null>(null);
  const [brokerRule, setBrokerRule] = useState<BrokerageRule | null>(null);
  const [brokerFallbackMode, setBrokerFallbackMode] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [calc, setCalc] = useState<CalcResult | null>(null);

  const exchange = useMemo(() => exchanges.find(e => e.id === exchangeId), [exchanges, exchangeId]);
  const script = useMemo(() => scripts.find(s => s.id === scriptId), [scripts, scriptId]);
  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  const broker = useMemo(() => brokers.find(b => b.id === brokerId), [brokers, brokerId]);

  useEffect(() => {
    if (!exchangeId || !clientId || !brokerId) {
      setClientRule(null);
      setBrokerRule(null);
      setBrokerFallbackMode(false);
      return;
    }

    const fetchRules = async () => {
      setIsLoadingRules(true);
      try {
        const scriptQuery = scriptId ? `&scriptId=${scriptId}` : '';
        const [clientRes, brokerRes] = await Promise.all([
          fetch(`http://localhost:4000/brokerages/resolve?accountId=${clientId}&exchangeId=${exchangeId}&appliesTo=CLIENT${scriptQuery}`),
          fetch(`http://localhost:4000/brokerages/resolve?accountId=${brokerId}&exchangeId=${exchangeId}&appliesTo=BROKER${scriptQuery}`),
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
        setBrokerFallbackMode(Boolean(resolvedClientRule && !resolvedBrokerRule));
      } catch (e) {
        console.error(e);
        setClientRule(null);
        setBrokerRule(null);
        setBrokerFallbackMode(false);
      } finally {
        setIsLoadingRules(false);
      }
    };

    fetchRules();
  }, [exchangeId, clientId, brokerId, scriptId]);

  useEffect(() => {
    if (!clientRule || (!brokerRule && !brokerFallbackMode)) {
      setCalc(null);
      return;
    }

    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');
    if (!qtyNum) {
      setCalc(null);
      return;
    }

    try {
      if (brokerFallbackMode) {
        const side: 'BUY' | 'SELL' = qtyNum >= 0 ? 'BUY' : 'SELL';
        const absQuantity = Math.abs(qtyNum);
        const tradeValue = Number((absQuantity * rateNum).toFixed(4));
        const marketRounded = Number(rateNum.toFixed(4));

        setCalc({
          side,
          absQuantity,
          tradeValue,
          clientBrokerage: 0,
          clientPerUnit: 0,
          clientRate: marketRounded,
          clientIsFixed: true,
          clientRuleType: clientRule.type,
          brokerBrokerage: 0,
          brokerPerUnit: 0,
          brokerRate: marketRounded,
          brokerIsFixed: true,
          brokerRuleType: clientRule.type,
          profit: 0,
          totalProfit: 0,
        });
        return;
      }

      setCalc(calculateTrade({
        quantity: qtyNum,
        marketRate: rateNum,
        segment: 'TRADING',
        clientRule,
        brokerRule: brokerRule as BrokerageRule,
      }));
    } catch (e) {
      console.error(e);
      setCalc(null);
    }
  }, [quantity, marketRate, clientRule, brokerRule, brokerFallbackMode]);

  const handleSave = async () => {
    if (!exchange || !script || !client || !broker || !calc) return;
    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');

    try {
      const res = await fetch('http://localhost:4000/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeNumber: `TRD-${Date.now().toString().slice(-6)}`,
          tradeDate: date,
          accountId: clientId,
          brokerId: brokerId,
          scriptId: scriptId,
          exchangeId: exchangeId,
          transactionType: qtyNum >= 0 ? 'BUY' : 'SELL',
          quantity: Math.abs(qtyNum),
          rate: rateNum,
          remarks: 'Manual Entry',
          source: 'MANUAL',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save trade');
      }

      toast.success('Trade saved successfully');
      onSave(await res.json());
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save trade');
    }
  };

  const canCalculate = Boolean(exchangeId && clientId && brokerId && scriptId && parseFloat(quantity || '0'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[980px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)] shrink-0">
          <div>
            <h2 className="card__title">Add Trade</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Exchange</label>
                  <select value={exchangeId} onChange={e => setExchangeId(e.target.value)} className="input">
                    <option value="">Select Exchange</option>
                    {exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Type</label>
                  <select value={tradeType} onChange={e => setTradeType(e.target.value)} className="input">
                    <option value="INTERNAL">Internal Trades</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
                </div>

                <div className="form-field">
                  <label className="form-label">Expiry date</label>
                  <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Quantity</label>
                  <input type="number" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 100 or -50" className="input" />
                  <p className="form-hint">Positive = BUY, Negative = SELL</p>
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Script</label>
                  <select value={scriptId} onChange={e => setScriptId(e.target.value)} className="input">
                    <option value="">Select Script</option>
                    {scripts.map(s => <option key={s.id} value={s.id}>{s.fldScriptName ?? s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Client</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} className="input">
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.fldName}</option>)}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Broker</label>
                  <select value={brokerId} onChange={e => setBrokerId(e.target.value)} className="input">
                    <option value="">Select Broker</option>
                    {brokers.map(b => <option key={b.id} value={b.id}>{b.name || b.fldName}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label form-label--required">Market rate</label>
                <input type="number" step="any" value={marketRate} onChange={e => setMarketRate(e.target.value)} placeholder="e.g. 250.50" className="input" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-xs text-[var(--color-slate)]">
                  <span className="font-semibold text-[var(--color-charcoal)]">Client rule:</span>{' '}
                  {isLoadingRules ? 'Loading…' : clientRule ? (clientRule.type === 'AMOUNT' ? 'Fixed amount (invoice)' : 'Percentage') : 'Not found'}
                </div>
                <div className="text-xs text-[var(--color-slate)] text-right">
                  <span className="font-semibold text-[var(--color-charcoal)]">Broker rule:</span>{' '}
                  {isLoadingRules
                    ? 'Loading…'
                    : brokerRule
                      ? (brokerRule.type === 'AMOUNT' ? 'Fixed amount (invoice)' : 'Percentage')
                      : brokerFallbackMode
                        ? 'Not found (using client fallback)'
                        : 'Not found'}
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
                    Select exchange, script, client, broker and enter quantity to calculate.
                  </div>
                ) : isLoadingRules ? (
                  <div className="text-sm text-[var(--color-fog)] pt-8">Loading brokerage rules…</div>
                ) : !clientRule || (!brokerRule && !brokerFallbackMode) ? (
                  <div className="text-sm text-[var(--color-negative)] pt-8">
                    Missing brokerage rule for {(!clientRule && !brokerRule) ? 'client and broker' : !clientRule ? 'client' : 'broker'}.
                  </div>
                ) : !calc ? (
                  <div className="text-sm text-[var(--color-fog)] pt-8">Enter market rate to see rates and profit.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--bg-card)] border border-[var(--color-border-light)] rounded-xl p-4">
                        <p className="text-[11px] text-[var(--color-slate)] font-semibold uppercase tracking-wide">Client</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-slate)]">Rate</span>
                            <span className="font-mono font-semibold text-[var(--color-charcoal)]">₹{calc.clientRate.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--color-fog)]">Brokerage</span>
                            <span className="font-mono text-[var(--color-slate)]">{calc.clientIsFixed ? 'Fixed (invoice)' : `₹${calc.clientBrokerage.toFixed(4)}`}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[var(--bg-card)] border border-[var(--color-border-light)] rounded-xl p-4">
                        <p className="text-[11px] text-[var(--color-slate)] font-semibold uppercase tracking-wide">Broker</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-slate)]">Rate</span>
                            <span className="font-mono font-semibold text-[var(--color-charcoal)]">₹{calc.brokerRate.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--color-fog)]">Brokerage</span>
                            <span className="font-mono text-[var(--color-slate)]">{calc.brokerIsFixed ? 'Fixed (invoice)' : `₹${calc.brokerBrokerage.toFixed(4)}`}</span>
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
                          {calc.totalProfit > 0 ? '+' : ''}₹{calc.totalProfit.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-slate)] mt-1">
                        Trade value ₹{calc.tradeValue.toFixed(4)} • per-unit ₹{calc.profit.toFixed(4)}
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
            disabled={!calc || !exchange || !script || !client || !broker}
          >
            Add Trade
          </button>
        </div>
      </div>
    </div>
  );
}
