'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateTrade, type BrokerageRule, type CalcResult } from 'utils';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';

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

        const clientData = await clientRes.json();
        const brokerData = await brokerRes.json();

        setClientRule(clientData && clientData.id ? clientData : null);
        setBrokerRule(brokerData && brokerData.id ? brokerData : null);
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

  useEffect(() => {
    if (!clientRule || !brokerRule) {
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
      // Segment not requested in the new UI; default to TRADING for now.
      setCalc(calculateTrade({
        quantity: qtyNum,
        marketRate: rateNum,
        segment: 'TRADING',
        clientRule,
        brokerRule,
      }));
    } catch (e) {
      console.error(e);
      setCalc(null);
    }
  }, [quantity, marketRate, clientRule, brokerRule]);

  const handleSave = () => {
    if (!exchange || !script || !client || !broker || !calc) return;
    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');
    onSave({
      id: crypto.randomUUID(),
      date,
      exchangeCode: exchange.code,
      scriptName: script.fldScriptName ?? script.name ?? 'Script',
      quantity: qtyNum,
      marketRate: rateNum,
      clientName: client.name || client.fldName,
      brokerName: broker.name || broker.fldName,
      clientRate: Number(calc.clientRate.toFixed(4)),
      brokerRate: Number(calc.brokerRate.toFixed(4)),
      profitTotal: Number(calc.totalProfit.toFixed(4)),
    });
    onClose();
  };

  const canCalculate = Boolean(exchangeId && clientId && brokerId && scriptId && parseFloat(quantity || '0'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="bg-surface border border-border shadow-xl w-[980px] rounded-2xl flex flex-col font-sans text-(--color-text-main) overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-border">
          <div>
            <h2 className="text-heading-3">Add Trade</h2>
            <p className="text-caption mt-1">Fill the form to instantly calculate client rate, broker rate and profit.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-12 gap-5">
            {/* Left: Inputs */}
            <div className="col-span-7 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Exchange *</label>
                  <select value={exchangeId} onChange={e => setExchangeId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="">Select Exchange</option>
                    {exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Type *</label>
                  <select value={tradeType} onChange={e => setTradeType(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="INTERNAL">Internal Trades</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Expiry date</label>
                  <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Quantity *</label>
                  <input type="number" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 100 or -50" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <p className="text-[11px] text-gray-500">Positive = BUY, Negative = SELL</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Script *</label>
                  <select value={scriptId} onChange={e => setScriptId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="">Select Script</option>
                    {scripts.map(s => <option key={s.id} value={s.id}>{s.fldScriptName ?? s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Client *</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.fldName}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Broker *</label>
                  <select value={brokerId} onChange={e => setBrokerId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="">Select Broker</option>
                    {brokers.map(b => <option key={b.id} value={b.id}>{b.name || b.fldName}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Market rate *</label>
                <input type="number" step="any" value={marketRate} onChange={e => setMarketRate(e.target.value)} placeholder="e.g. 250.50" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Client rule:</span>{' '}
                  {isLoadingRules ? 'Loading…' : clientRule ? (clientRule.type === 'AMOUNT' ? 'Fixed amount (invoice)' : 'Percentage') : 'Not found'}
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <span className="font-semibold text-gray-700">Broker rule:</span>{' '}
                  {isLoadingRules ? 'Loading…' : brokerRule ? (brokerRule.type === 'AMOUNT' ? 'Fixed amount (invoice)' : 'Percentage') : 'Not found'}
                </div>
              </div>
            </div>

            {/* Right: Results */}
            <div className="col-span-5">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Live result</h3>
                  {calc?.side ? (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${calc.side === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {calc.side}
                    </span>
                  ) : null}
                </div>

                {!canCalculate ? (
                  <div className="text-sm text-gray-400 pt-8">
                    Select exchange, script, client, broker and enter quantity to calculate.
                  </div>
                ) : isLoadingRules ? (
                  <div className="text-sm text-gray-400 pt-8">Loading brokerage rules…</div>
                ) : !clientRule || !brokerRule ? (
                  <div className="text-sm text-red-600 pt-8">
                    Missing brokerage rule for {(!clientRule && !brokerRule) ? 'client and broker' : !clientRule ? 'client' : 'broker'}.
                  </div>
                ) : !calc ? (
                  <div className="text-sm text-gray-400 pt-8">Enter market rate to see rates and profit.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Client</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Rate</span>
                            <span className="font-mono font-semibold">₹{calc.clientRate.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Brokerage</span>
                            <span className="font-mono text-gray-700">{calc.clientIsFixed ? 'Fixed (invoice)' : `₹${calc.clientBrokerage.toFixed(4)}`}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Broker</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Rate</span>
                            <span className="font-mono font-semibold">₹{calc.brokerRate.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Brokerage</span>
                            <span className="font-mono text-gray-700">{calc.brokerIsFixed ? 'Fixed (invoice)' : `₹${calc.brokerBrokerage.toFixed(4)}`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`border rounded-xl p-4 ${calc.totalProfit > 0 ? 'bg-green-50 border-green-200' : calc.totalProfit < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">Profit</span>
                        <span className={`font-mono text-lg font-bold ${calc.totalProfit > 0 ? 'text-green-700' : calc.totalProfit < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                          {calc.totalProfit > 0 ? '+' : ''}₹{calc.totalProfit.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Trade value ₹{calc.tradeValue.toFixed(4)} • per-unit ₹{calc.profit.toFixed(4)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
              disabled={!calc || !exchange || !script || !client || !broker}
            >
              Add Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

