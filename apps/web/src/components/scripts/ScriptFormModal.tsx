'use client';
import { useState } from 'react';

export function ScriptFormModal({ initialData, onClose }: { initialData?: any, onClose: () => void }) {
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Script' : 'New Script'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          <form id="scriptForm" onSubmit={handleSubmit} className="space-y-6 text-black">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5">
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Full Script Name *</label>
                <input required name="fldScriptName" value={formData.fldScriptName} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Short Name</label>
                <input name="fldShortScript" value={formData.fldShortScript} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">ISIN Structure</label>
                <input name="fldISIN" value={formData.fldISIN} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>

              <div className="md:col-span-3 pb-2 pt-2 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-700">Exchange Codes</h4>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">BSE Code</label>
                <input name="fldScriptBSE" value={formData.fldScriptBSE} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">NSE Code</label>
                <input name="fldScriptNSE" value={formData.fldScriptNSE} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">MCX Code</label>
                <input name="fldScriptMCX" value={formData.fldScriptMCX} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">NCDEX Code</label>
                <input name="fldScriptNCD" value={formData.fldScriptNCD} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">ASE Code</label>
                <input name="fldScriptASE" value={formData.fldScriptASE} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>

              <div className="md:col-span-3 pb-2 pt-2 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-700">Calculations & Margins</h4>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Multiplier</label>
                <input type="number" step="0.01" name="fldMultiplier" value={formData.fldMultiplier} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Divider</label>
                <input type="number" step="0.01" name="fldDivider" value={formData.fldDivider} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Lot Size</label>
                <input type="number" name="fldLotSize" value={formData.fldLotSize} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Tick Price</label>
                <input type="number" step="0.01" name="fldTP" value={formData.fldTP} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Margin (%)</label>
                <input type="number" step="0.01" name="fldMargin" value={formData.fldMargin} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Closing Rate</label>
                <input type="number" step="0.01" name="fldPrice" value={formData.fldPrice} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
              </div>

            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition">Cancel</button>
          <button type="submit" form="scriptForm" className="px-8 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded shadow-sm hover:bg-blue-700 transition">Save Script</button>
        </div>
      </div>
    </div>
  );
}
