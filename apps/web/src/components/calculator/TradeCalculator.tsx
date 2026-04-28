'use client';
import { useState, useMemo, useEffect } from 'react';
import { calculateTrade, CalcInput, CalcResult, BrokerageRule } from 'utils';

export function TradeCalculator({ 
  exchanges, 
  accounts, 
  scripts 
}: { 
  exchanges: any[], 
  accounts: any[], 
  scripts: any[] 
}) {
  const [exchangeId, setExchangeId] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [clientId, setClientId] = useState('');
  const [brokerId, setBrokerId] = useState('');
  
  const [segment, setSegment] = useState<'TRADING' | 'DELIVERY'>('TRADING');
  const [quantity, setQuantity] = useState<string>('');
  const [marketRate, setMarketRate] = useState<string>('');

  const [clientRule, setClientRule] = useState<BrokerageRule | null>(null);
  const [brokerRule, setBrokerRule] = useState<BrokerageRule | null>(null);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  
  const [result, setResult] = useState<CalcResult | null>(null);

  const clients = useMemo(() => accounts.filter(a => a.group?.fldGroupName === 'Client'), [accounts]);
  const brokers = useMemo(() => accounts.filter(a => a.group?.fldGroupName === 'Broker'), [accounts]);

  // Fetch rules when dependencies change
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
          fetch(`http://localhost:4000/brokerages/resolve?accountId=${brokerId}&exchangeId=${exchangeId}&appliesTo=BROKER${scriptQuery}`)
        ]);

        const clientData = await clientRes.json();
        const brokerData = await brokerRes.json();

        // resolve returns null when no rule found, or the rule object
        setClientRule(clientData && clientData.id ? clientData : null);
        setBrokerRule(brokerData && brokerData.id ? brokerData : null);
      } catch (err) {
        console.error('Failed to resolve rules:', err);
      } finally {
        setIsLoadingRules(false);
      }
    };

    fetchRules();
  }, [exchangeId, clientId, brokerId, scriptId]);

  // Recalculate on any input change
  useEffect(() => {
    if (!clientRule || !brokerRule) {
      setResult(null);
      return;
    }

    const qtyNum = parseFloat(quantity || '0');
    const rateNum = parseFloat(marketRate || '0');

    if (qtyNum === 0) {
      setResult(null);
      return;
    }

    const input: CalcInput = {
      quantity: qtyNum,
      marketRate: rateNum,
      segment,
      clientRule,
      brokerRule
    };

    try {
      const res = calculateTrade(input);
      setResult(res);
    } catch (e) {
      console.error('Calculation error:', e);
      setResult(null);
    }
  }, [quantity, marketRate, segment, clientRule, brokerRule]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LEFT PANEL - INPUTS */}
      <div className="card space-y-6">
        <h2 className="text-xl font-bold border-b pb-4">Trade Configuration</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
              <option value="">Select Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.fldName}</option>)}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Broker</label>
            <select value={brokerId} onChange={e => setBrokerId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
              <option value="">Select Broker</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.fldName}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Exchange</label>
            <select value={exchangeId} onChange={e => setExchangeId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
              <option value="">Select Exchange</option>
              {exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Script (Optional)</label>
            <select value={scriptId} onChange={e => setScriptId(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
              <option value="">Any Script (Default)</option>
              {scripts.map(s => <option key={s.id} value={s.id}>{s.fldScriptName}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Segment</label>
            <select value={segment} onChange={e => setSegment(e.target.value as any)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
              <option value="TRADING">Trading</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Quantity (+ for BUY, - for SELL)</label>
            <input type="number" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 100 or -50" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Market Rate</label>
            <input type="number" step="any" value={marketRate} onChange={e => setMarketRate(e.target.value)} placeholder="e.g. 250.50" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
          </div>
        </div>

        {/* Rule Status Badges */}
        {(clientRule || brokerRule) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client Rule</span>
              {clientRule ? (
                <div className={`text-xs px-3 py-1.5 rounded-lg font-semibold inline-block ${
                  clientRule.type === 'AMOUNT' 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {clientRule.type === 'AMOUNT' ? '₹ Fixed (at Invoice)' : '% Percentage'}
                </div>
              ) : (
                <div className="text-xs text-red-500">Not configured</div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Broker Rule</span>
              {brokerRule ? (
                <div className={`text-xs px-3 py-1.5 rounded-lg font-semibold inline-block ${
                  brokerRule.type === 'AMOUNT' 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {brokerRule.type === 'AMOUNT' ? '₹ Fixed (at Invoice)' : '% Percentage'}
                </div>
              ) : (
                <div className="text-xs text-red-500">Not configured</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT PANEL - RESULTS */}
      <div className="card space-y-6 bg-gray-50 flex flex-col border-[var(--color-border)] shadow-inner">
        <h2 className="text-xl font-bold border-b border-gray-200 pb-4">Live Breakdown</h2>

        {!exchangeId || !clientId || !brokerId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select Client, Broker, and Exchange to load rules.
          </div>
        ) : isLoadingRules ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Loading brokerage rules...
          </div>
        ) : !clientRule || !brokerRule ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-500 text-sm gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>Missing rules!</p>
            {!clientRule && <p className="text-xs text-gray-500">Client rule not found.</p>}
            {!brokerRule && <p className="text-xs text-gray-500">Broker rule not found.</p>}
          </div>
        ) : !result ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Enter non-zero quantity to see calculation.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Trade Direction */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-gray-500 font-medium">Trade Direction</span>
              {result.side === 'BUY' ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">BUY</span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold">SELL</span>
              )}
            </div>

            {/* Trade Value */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-gray-500 font-medium">Total Trade Value</span>
              <span className="font-mono text-lg text-gray-900 font-semibold">₹{result.tradeValue.toFixed(4)}</span>
            </div>

            {/* Client & Broker View */}
            <div className="grid grid-cols-2 gap-4">
              {/* Client View */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Client View</h3>
                
                {result.clientIsFixed ? (
                  <>
                    <div className="flex items-center gap-2 py-1">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold rounded border border-amber-200">FIXED</span>
                      <span className="text-xs text-gray-500">Brokerage at invoice</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <span className="text-sm font-semibold text-gray-700">Net Rate</span>
                      <span className="font-mono text-sm font-bold text-gray-900">₹{result.clientRate.toFixed(4)}</span>
                    </div>
                    <p className="text-[10px] text-amber-600 leading-tight">Rate = Market Rate. Fixed brokerage will be charged on invoice.</p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Brokerage</span>
                      <span className="font-mono text-sm text-red-600">₹{result.clientBrokerage.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Per Unit</span>
                      <span className="font-mono text-sm text-gray-600">₹{result.clientPerUnit.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <span className="text-sm font-semibold text-gray-700">Net Rate</span>
                      <span className="font-mono text-sm font-bold text-gray-900">₹{result.clientRate.toFixed(4)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Broker View */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Broker View</h3>
                
                {result.brokerIsFixed ? (
                  <>
                    <div className="flex items-center gap-2 py-1">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold rounded border border-amber-200">FIXED</span>
                      <span className="text-xs text-gray-500">Brokerage at invoice</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <span className="text-sm font-semibold text-gray-700">Net Rate</span>
                      <span className="font-mono text-sm font-bold text-gray-900">₹{result.brokerRate.toFixed(4)}</span>
                    </div>
                    <p className="text-[10px] text-amber-600 leading-tight">Rate = Market Rate. Fixed brokerage will be charged on invoice.</p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Brokerage</span>
                      <span className="font-mono text-sm text-red-600">₹{result.brokerBrokerage.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Per Unit</span>
                      <span className="font-mono text-sm text-gray-600">₹{result.brokerPerUnit.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <span className="text-sm font-semibold text-gray-700">Net Rate</span>
                      <span className="font-mono text-sm font-bold text-gray-900">₹{result.brokerRate.toFixed(4)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Profit Display */}
            <div className={`p-5 rounded-xl border shadow-sm ${
              (result.clientIsFixed || result.brokerIsFixed) 
                ? 'bg-amber-50 border-amber-200' 
                : result.profit > 0 ? 'bg-green-50 border-green-200' 
                : result.profit < 0 ? 'bg-red-50 border-red-200' 
                : 'bg-gray-100 border-gray-200'
            }`}>
              {(result.clientIsFixed || result.brokerIsFixed) ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-amber-700">System Profit</span>
                    <span className="font-mono text-xl font-bold text-amber-700">
                      {result.totalProfit !== 0 ? (
                        <>{result.totalProfit > 0 ? '+' : ''}₹{result.totalProfit.toFixed(4)}</>
                      ) : (
                        'Pending'
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600">
                    {result.clientIsFixed && result.brokerIsFixed 
                      ? 'Both client & broker have fixed brokerage. Full profit will be calculated at invoice.'
                      : result.clientIsFixed 
                        ? 'Client has fixed brokerage. Partial profit shown — full calculation at invoice.'
                        : 'Broker has fixed brokerage. Partial profit shown — full calculation at invoice.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${
                      result.profit > 0 ? 'text-green-700' : 
                      result.profit < 0 ? 'text-red-700' : 'text-gray-600'
                    }`}>System Profit (per unit)</span>
                    <span className={`font-mono text-lg font-bold ${
                      result.profit > 0 ? 'text-green-700' : 
                      result.profit < 0 ? 'text-red-700' : 'text-gray-700'
                    }`}>
                      {result.profit > 0 ? '+' : ''}₹{result.profit.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      result.totalProfit > 0 ? 'text-green-600' : 
                      result.totalProfit < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>Total Profit ({result.absQuantity} units)</span>
                    <span className={`font-mono text-sm font-semibold ${
                      result.totalProfit > 0 ? 'text-green-700' : 
                      result.totalProfit < 0 ? 'text-red-700' : 'text-gray-700'
                    }`}>
                      {result.totalProfit > 0 ? '+' : ''}₹{result.totalProfit.toFixed(4)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-center text-gray-400">
              Rates are per unit. Trade value = {result.absQuantity} units × ₹{(result.tradeValue / (result.absQuantity || 1)).toFixed(4)}.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
