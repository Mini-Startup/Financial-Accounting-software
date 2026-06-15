'use client';
import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';

export function ClosingRateFormModal({ 
  initialData, 
  exchanges, 
  scripts, 
  onClose 
}: { 
  initialData?: any;
  exchanges: any[];
  scripts: any[];
  onClose: () => void;
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [formData, setFormData] = useState({
    exchangeId: initialData?.exchangeId || (exchanges[0]?.id || ''),
    scriptId: initialData?.scriptId || (scripts[0]?.id || ''),
    rateDate: initialData?.rateDate ? new Date(initialData.rateDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    rate: initialData?.rate || '',
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exchangeId || !formData.scriptId || !formData.rateDate || formData.rate === '') {
      alert('Please fill out all fields.');
      return;
    }
    try {
      const url = initialData?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/closing-rates/${initialData.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/closing-rates`;
      
      const payload = {
        exchangeId: formData.exchangeId,
        scriptId: formData.scriptId,
        rateDate: new Date(formData.rateDate).toISOString(),
        rate: Number(formData.rate)
      };
      
      const res = await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Save failed.');
      }
      
      window.location.reload();
    } catch(err: any) {
      console.error(err);
      alert(err.message || 'Save failed. A closing rate for this exchange, script, and date combination may already exist.');
    }
  }

  const handleChange = (e: any) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[500px] max-w-[95vw] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)]">
          <div className="flex items-center gap-2">
            <h2 className="card__title font-display text-lg font-bold">
              {initialData ? 'Edit Closing Rate' : 'Add Closing Rate'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card__body p-6">
          <form id="closingRateForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-4 items-center text-sm">
              <label className="form-label font-medium text-slate-700">Date</label>
              <input required type="date" name="rateDate" value={formData.rateDate} onChange={handleChange} className="input" />

              <label className="form-label font-medium text-slate-700">Exchange</label>
              <select name="exchangeId" value={formData.exchangeId} onChange={handleChange} className="input text-slate-900" style={{ color: 'var(--color-charcoal)' }}>
                {exchanges.map(ex => (
                  <option key={ex.id} value={ex.id} className="text-slate-900">{ex.code}</option>
                ))}
              </select>

              <label className="form-label font-medium text-slate-700">Script</label>
              <select name="scriptId" value={formData.scriptId} onChange={handleChange} className="input text-slate-900" style={{ color: 'var(--color-charcoal)' }}>
                {scripts.map(s => (
                  <option key={s.id} value={s.id} className="text-slate-900">{s.shortName}</option>
                ))}
              </select>

              <label className="form-label font-medium text-slate-700">Closing Rate</label>
              <input required type="number" step="0.01" min="0" name="rate" value={formData.rate} onChange={handleChange} placeholder="0.00" className="input" />
            </div>
            
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
               <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
               <button type="submit" form="closingRateForm" className="btn btn--primary">Save Closing Rate</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
