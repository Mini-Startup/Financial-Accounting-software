'use client';
import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';

export function ScriptFormModal({ initialData, onClose }: { initialData?: any, onClose: () => void }) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [formData, setFormData] = useState({
    fldShortScript: initialData?.fldShortScript || '',
    fldScriptName: initialData?.fldScriptName || '',
    fldISIN: initialData?.fldISIN || '',
    fldScriptASE: initialData?.fldScriptASE || '',
    fldScriptBSE: initialData?.fldScriptBSE || '',
    fldScriptNSE: initialData?.fldScriptNSE || '',
    fldScriptMCX: initialData?.fldScriptMCX || '',
    fldScriptNCD: initialData?.fldScriptNCD || '',
    fldMultiplier: initialData?.fldMultiplier || '',
    fldDivider: initialData?.fldDivider || '',
    fldLotSize: initialData?.fldLotSize || '',
    fldTP: initialData?.fldTP || '',
    fldMargin: initialData?.fldMargin || '',
    fldPrice: initialData?.fldPrice || '',
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `http://localhost:4000/scripts/${initialData.id}` 
        : `http://localhost:4000/scripts`;
      
      await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      window.location.reload();
    } catch(err) {
      console.error(err);
      alert('Save failed.');
    }
  }

  const handleChange = (e: any) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[650px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)]">
          <div className="flex items-center gap-2">
            <h2 className="card__title">
              {initialData ? `Edit Scrip` : `Create New Scrip`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card__body p-6">
          {initialData && (
            <div className="mb-6 pb-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-slate)] uppercase tracking-wide font-semibold">Selected Record</p>
                <p className="text-sm font-semibold text-[var(--color-forest)] mt-0.5">{formData.fldShortScript || formData.fldScriptName}</p>
              </div>
            </div>
          )}


          <form id="scriptForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[80px_100px_40px_100px_70px_1fr] gap-x-4 gap-y-4 items-center text-sm">
              <label className="form-label">Short Name</label>
              <input name="fldShortScript" value={formData.fldShortScript} onChange={handleChange} className="input" />
              
              <label className="form-label text-right pr-1">ISIN</label>
              <input name="fldISIN" value={formData.fldISIN || ''} onChange={handleChange} className="input" />
              
              <label className="form-label text-right pr-1">ASE code</label>
              <input name="fldScriptASE" value={formData.fldScriptASE || ''} onChange={handleChange} className="input" />
              
              <label className="form-label">Full Name</label>
              <input required name="fldScriptName" value={formData.fldScriptName} onChange={handleChange} className="col-span-3 input" />
              
              <label className="form-label text-right pr-1">BSE code</label>
              <input name="fldScriptBSE" value={formData.fldScriptBSE || ''} onChange={handleChange} className="input" />
              
              <label className="form-label">Multiplier</label>
              <input type="number" step="0.0001" name="fldMultiplier" value={formData.fldMultiplier || '1.0000'} onChange={handleChange} className="input text-right font-mono text-sm" />

              <label className="form-label text-right pr-1">Divider</label>
              <input type="number" step="0.0001" name="fldDivider" value={formData.fldDivider || '1.0000'} onChange={handleChange} className="input text-right font-mono text-sm" />
              
              <label className="form-label text-right pr-1">NSE code</label>
              <input name="fldScriptNSE" value={formData.fldScriptNSE || ''} onChange={handleChange} className="input" />
              
              <label className="form-label">LotSize</label>
              <input type="number" name="fldLotSize" value={formData.fldLotSize || '1'} onChange={handleChange} className="input text-right font-mono text-sm" />

              <label className="form-label text-right pr-1">Fix Margin%</label>
              <input type="number" step="0.0001" name="fldMargin" value={formData.fldMargin || '0.0000'} onChange={handleChange} className="input text-right font-mono text-sm" />
              
              <label className="form-label text-right pr-1">MCX code</label>
              <input name="fldScriptMCX" value={formData.fldScriptMCX || ''} onChange={handleChange} className="input" />
              
              <label className="form-label">Tick-Price</label>
              <input type="number" step="0.0001" name="fldTP" value={formData.fldTP || '1.0000'} onChange={handleChange} className="input text-right font-mono text-sm" />

              <label className="form-label text-right pr-1 whitespace-nowrap">Closing rate</label>
              <input type="number" step="0.0001" name="fldPrice" value={formData.fldPrice || '0.0000'} onChange={handleChange} className="input text-right font-mono text-sm" />
              
              <label className="form-label text-right pr-1">NCDEX code</label>
              <input name="fldScriptNCD" value={formData.fldScriptNCD || ''} onChange={handleChange} className="input" />
            </div>

            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
               <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
               <button type="submit" form="scriptForm" className="btn btn--primary">Save Scrip</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
