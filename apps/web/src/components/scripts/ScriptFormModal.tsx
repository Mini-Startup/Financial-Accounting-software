'use client';
import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl w-[650px] rounded-2xl flex flex-col font-sans text-[var(--color-text-main)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-3">
              {initialData ? `Edit Scrip` : `Create New Scrip`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {initialData && (
            <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-caption">Selected Record</p>
                <p className="text-title text-[var(--color-primary)]">{formData.fldShortScript || formData.fldScriptName}</p>
              </div>
            </div>
          )}


          <form id="scriptForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[80px_100px_40px_100px_70px_1fr] gap-x-4 gap-y-4 items-center text-sm">
              <label className="text-gray-600 font-medium">Short Name</label>
              <input name="fldShortScript" value={formData.fldShortScript} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <label className="text-right pr-1 text-gray-600 font-medium">ISIN</label>
              <input name="fldISIN" value={formData.fldISIN || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <label className="text-right pr-1 text-gray-600 font-medium">ASE code</label>
              <input name="fldScriptASE" value={formData.fldScriptASE || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <label className="text-gray-600 font-medium">Full Name</label>
              <input required name="fldScriptName" value={formData.fldScriptName} onChange={handleChange} className="col-span-3 w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <label className="text-right pr-1 text-gray-600 font-medium">BSE code</label>
              <input name="fldScriptBSE" value={formData.fldScriptBSE || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <label className="text-gray-600 font-medium">Multiplier</label>
              <input type="number" step="0.0001" name="fldMultiplier" value={formData.fldMultiplier || '1.0000'} onChange={handleChange} className="bg-gray-100 px-2 text-right w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-mono text-sm" />

              <label className="text-right pr-1 text-gray-600 font-medium">Divider</label>
              <input type="number" step="0.0001" name="fldDivider" value={formData.fldDivider || '1.0000'} onChange={handleChange} className="text-right w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-mono text-sm" />
              
              <label className="text-right pr-1 text-gray-600 font-medium">NSE code</label>
              <input name="fldScriptNSE" value={formData.fldScriptNSE || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <label className="text-gray-600 font-medium">LotSize</label>
              <input type="number" name="fldLotSize" value={formData.fldLotSize || '1'} onChange={handleChange} className="text-right w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-mono text-sm" />

              <label className="text-right pr-1 text-gray-600 font-medium">Fix Margin%</label>
              <input type="number" step="0.0001" name="fldMargin" value={formData.fldMargin || '0.0000'} onChange={handleChange} className="text-right w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-mono text-sm" />
              
              <label className="text-right pr-1 text-gray-600 font-medium">MCX code</label>
              <input name="fldScriptMCX" value={formData.fldScriptMCX || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <label className="text-gray-600 font-medium">Tick-Price</label>
              <input type="number" step="0.0001" name="fldTP" value={formData.fldTP || '1.0000'} onChange={handleChange} className="text-right w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-mono text-sm" />

              <label className="text-right pr-1 whitespace-nowrap text-gray-600 font-medium">Closing rate</label>
              <input type="number" step="0.0001" name="fldPrice" value={formData.fldPrice || '0.0000'} onChange={handleChange} className="text-right w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-mono text-sm" />
              
              <label className="text-right pr-1 text-gray-600 font-medium">NCDEX code</label>
              <input name="fldScriptNCD" value={formData.fldScriptNCD || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
            </div>

            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-gray-100">
               <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
               <button type="submit" form="scriptForm" className="btn-primary">Save Scrip</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
