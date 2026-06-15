'use client';
import { useState, useMemo } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';

export function BrokerageFormModal({ 
  exchanges, 
  accounts, 
  scripts, 
  onClose 
}: { 
  exchanges: any[], 
  accounts: any[], 
  scripts: any[], 
  onClose: () => void 
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [formData, setFormData] = useState({
    exchangeId: '',
    appliesTo: 'CLIENT',
    accountId: '',
    type: 'PERCENT',
    scope: 'DEFAULT',
    scriptId: '',
    
    baseAmount: '',
    flatFee: '',
    
    tradingBuyPct: '',
    tradingSellPct: '',
    tradingMinFee: '',
    
    deliveryBuyPct: '',
    deliverySellPct: '',
    deliveryMinFee: '',
  });

  const filteredAccounts = useMemo(() => {
    const groupMatcher = formData.appliesTo === 'CLIENT' ? 'Sundry Debtors' : 'Sundry Creditors';
    return accounts.filter(acc => acc.group?.name === groupMatcher || acc.group?.fldGroupName === groupMatcher);
  }, [accounts, formData.appliesTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        exchangeId: formData.exchangeId,
        appliesTo: formData.appliesTo,
        accountId: formData.accountId,
        type: formData.type,
        scope: formData.scope,
      };

      if (formData.scope === 'SCRIPT') {
        payload.scriptId = formData.scriptId;
      }

      if (formData.type === 'AMOUNT') {
        payload.baseAmount = parseFloat(formData.baseAmount);
        payload.flatFee = parseFloat(formData.flatFee);
      } else {
        payload.tradingBuyPct = parseFloat(formData.tradingBuyPct || '0');
        payload.tradingSellPct = parseFloat(formData.tradingSellPct || '0');
        payload.tradingMinFee = parseFloat(formData.tradingMinFee || '0');
        payload.deliveryBuyPct = parseFloat(formData.deliveryBuyPct || '0');
        payload.deliverySellPct = parseFloat(formData.deliverySellPct || '0');
        payload.deliveryMinFee = parseFloat(formData.deliveryMinFee || '0');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + err.message);
        return;
      }
      
      window.location.reload();
    } catch(err: any) {
      console.error(err);
      alert('Save failed.');
    }
  }

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl w-[900px] max-w-[95vw] max-h-[92vh] rounded-2xl flex flex-col font-sans text-[var(--color-text-main)] overflow-hidden">
        
        <div className="px-6 py-4 flex justify-between items-center border-b border-[var(--color-border)]">
          <h2 className="text-heading-3">Create Brokerage Rule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="brokerageForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Exchange *</label>
                <select required name="exchangeId" value={formData.exchangeId} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
                  <option value="">Select Exchange</option>
                  {exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Applies To *</label>
                <select required name="appliesTo" value={formData.appliesTo} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
                  <option value="CLIENT">Client</option>
                  <option value="BROKER">Broker</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Account *</label>
              <select required name="accountId" value={formData.accountId} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
                <option value="">Select Account</option>
                {filteredAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {(acc.name || acc.fldName) ?? 'Unnamed'} ({acc.code || acc.fldClient || acc.id.substring(0, 8)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type *</label>
                <select required name="type" value={formData.type} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
                  <option value="PERCENT">Percentage</option>
                  <option value="AMOUNT">Flat Amount</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Scope *</label>
                <select required name="scope" value={formData.scope} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]">
                  <option value="DEFAULT">Default</option>
                  <option value="SCRIPT">Script Specific</option>
                </select>
              </div>
            </div>

            {formData.scope === 'SCRIPT' && (
              <div className="space-y-1 border-l-4 border-blue-500 pl-4 py-1">
                <label className="text-sm font-medium text-gray-700">Select Script *</label>
                <select required name="scriptId" value={formData.scriptId} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] bg-blue-50/30">
                  <option value="">Select Script...</option>
                  {scripts.map(s => <option key={s.id} value={s.id}>{s.fullName || s.fldScriptName}</option>)}
                </select>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Fee Configuration</h3>
              
              {formData.type === 'AMOUNT' ? (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Base Amount</label>
                    <input required type="number" step="any" name="baseAmount" value={formData.baseAmount} onChange={handleChange} placeholder="e.g. 1000" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Flat Fee</label>
                    <input required type="number" step="any" name="flatFee" value={formData.flatFee} onChange={handleChange} placeholder="e.g. 10" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">TRADING</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Buy Pct (%)</label>
                        <input type="number" step="any" name="tradingBuyPct" value={formData.tradingBuyPct} onChange={handleChange} className="w-full border border-gray-200 rounded-md p-1.5 outline-none focus:border-[var(--color-primary)] text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Sell Pct (%)</label>
                        <input type="number" step="any" name="tradingSellPct" value={formData.tradingSellPct} onChange={handleChange} className="w-full border border-gray-200 rounded-md p-1.5 outline-none focus:border-[var(--color-primary)] text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Min Fee</label>
                        <input type="number" step="any" name="tradingMinFee" value={formData.tradingMinFee} onChange={handleChange} className="w-full border border-gray-200 rounded-md p-1.5 outline-none focus:border-[var(--color-primary)] text-sm" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">DELIVERY</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Buy Pct (%)</label>
                        <input type="number" step="any" name="deliveryBuyPct" value={formData.deliveryBuyPct} onChange={handleChange} className="w-full border border-gray-200 rounded-md p-1.5 outline-none focus:border-[var(--color-primary)] text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Sell Pct (%)</label>
                        <input type="number" step="any" name="deliverySellPct" value={formData.deliverySellPct} onChange={handleChange} className="w-full border border-gray-200 rounded-md p-1.5 outline-none focus:border-[var(--color-primary)] text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Min Fee</label>
                        <input type="number" step="any" name="deliveryMinFee" value={formData.deliveryMinFee} onChange={handleChange} className="w-full border border-gray-200 rounded-md p-1.5 outline-none focus:border-[var(--color-primary)] text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="px-6 py-4 flex justify-end gap-3 border-t border-[var(--color-border)] bg-gray-50/50">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="brokerageForm" className="btn-primary">Save</button>
        </div>
        
      </div>
    </div>
  );
}
