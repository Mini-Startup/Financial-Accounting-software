'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { UniversalDropdown } from '../ui/UniversalDropdown';

export function BrokerageFormModal({ 
  exchanges, 
  accounts, 
  scripts, 
  onClose,
  persistFields = ['exchangeId', 'accountId', 'appliesTo'],
}: { 
  exchanges: any[], 
  accounts: any[], 
  scripts: any[], 
  onClose: () => void,
  persistFields?: string[],
}) {
  const router = useRouter();
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      setIsSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        toast.error('Error: ' + (err.message || 'Failed to save brokerage rule'));
        return;
      }
      
      toast.success('Brokerage rule saved successfully');
      router.refresh();

      // Selective reset keeping configured persistFields (e.g. accountId, exchangeId)
      setFormData(prev => ({
        exchangeId: persistFields.includes('exchangeId') ? prev.exchangeId : '',
        appliesTo: persistFields.includes('appliesTo') ? prev.appliesTo : 'CLIENT',
        accountId: persistFields.includes('accountId') ? prev.accountId : '',
        type: prev.type,
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
      }));
    } catch(err: any) {
      console.error(err);
      toast.error(err.message || 'Save failed.');
    } finally {
      setIsSubmitting(false);
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
                <UniversalDropdown
                  value={formData.exchangeId}
                  options={exchanges.map((ex) => ({ value: ex.id, label: ex.code }))}
                  onChange={(val) => setFormData((prev) => ({ ...prev, exchangeId: val }))}
                  placeholder="Select Exchange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Applies To *</label>
                <UniversalDropdown
                  value={formData.appliesTo}
                  options={[
                    { value: 'CLIENT', label: 'Client' },
                    { value: 'BROKER', label: 'Broker' },
                  ]}
                  onChange={(val) => setFormData((prev) => ({ ...prev, appliesTo: val }))}
                  placeholder="Select Applies To"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Account *</label>
              <UniversalDropdown
                value={formData.accountId}
                options={filteredAccounts.map((acc) => ({
                  value: acc.id,
                  label: `${(acc.name || acc.fldName) ?? 'Unnamed'} (${acc.code || acc.fldClient || acc.id.substring(0, 8)})`,
                }))}
                onChange={(val) => setFormData((prev) => ({ ...prev, accountId: val }))}
                placeholder="Select Account"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type *</label>
                <UniversalDropdown
                  value={formData.type}
                  options={[
                    { value: 'PERCENT', label: 'Percentage' },
                    { value: 'AMOUNT', label: 'Flat Amount' },
                  ]}
                  onChange={(val) => setFormData((prev) => ({ ...prev, type: val }))}
                  placeholder="Select Type"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Scope *</label>
                <UniversalDropdown
                  value={formData.scope}
                  options={[
                    { value: 'DEFAULT', label: 'Default' },
                    { value: 'SCRIPT', label: 'Script Specific' },
                  ]}
                  onChange={(val) => setFormData((prev) => ({ ...prev, scope: val }))}
                  placeholder="Select Scope"
                />
              </div>
            </div>

            {formData.scope === 'SCRIPT' && (
              <div className="space-y-1 border-l-4 border-[var(--color-primary)] pl-4 py-1">
                <label className="text-sm font-medium text-gray-700">Select Script *</label>
                <UniversalDropdown
                  value={formData.scriptId}
                  options={scripts.map((s) => ({
                    value: s.id,
                    label: s.fullName || s.fldScriptName || s.shortName,
                  }))}
                  onChange={(val) => setFormData((prev) => ({ ...prev, scriptId: val }))}
                  placeholder="Select Script..."
                />
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
          <button type="submit" form="brokerageForm" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
