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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent backdrop-blur-none pointer-events-none">
      <div className="bg-[#e8ecf1] shadow-2xl w-[600px] border-2 border-blue-300 rounded-sm flex flex-col font-sans text-black pointer-events-auto overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#bbd2eb] to-[#e8ecf1] px-2 py-1 flex justify-between items-center border-b border-gray-300 cursor-move">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-3 h-3 bg-white border border-gray-400 inline-block"></span>
            Scrip Information
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-black hover:bg-red-200 px-2 py-0.5 rounded transition">
            ✕
          </button>
        </div>

        {/* Global Header */}
        <div className="p-3 bg-[#e8ecf1]">
          <div className="bg-white border border-gray-300 px-3 py-1 text-center font-bold text-sm text-blue-900 mx-1 mb-2">
            {formData.fldShortScript || formData.fldScriptName || 'Create New Scrip'}
          </div>

          {/* Tab Strip */}
          <div className="flex border-b border-gray-400 mb-4 px-2 space-x-1">
            <div className="bg-white px-3 py-1 text-xs border border-b-0 border-gray-400 cursor-default shadow-[0_-1px_0_0_rgba(0,0,0,0.1)]">Scrip</div>
            <div className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer">Exchange Code</div>
            <div className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer">Brokerage</div>
            <div className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer">Settings</div>
          </div>

          <form id="scriptForm" onSubmit={handleSubmit} className="px-2 pb-4">
            <div className="grid grid-cols-[80px_100px_40px_100px_70px_1fr] gap-x-2 gap-y-2 items-center text-xs font-semibold">
              <label>Short Name</label>
              <input name="fldShortScript" value={formData.fldShortScript} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              
              <label className="text-right pr-1">ISIN</label>
              <input name="fldISIN" value={formData.fldISIN || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              
              <label className="text-right pr-1">ASE code</label>
              <input name="fldScriptASE" value={formData.fldScriptASE || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              
              <label>Full Name</label>
              <input required name="fldScriptName" value={formData.fldScriptName} onChange={handleChange} className="col-span-3 w-full border border-gray-400 p-1" />
              
              <label className="text-right pr-1">BSE code</label>
              <input name="fldScriptBSE" value={formData.fldScriptBSE || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              
              <label>Multiplier</label>
              <input type="number" step="0.0001" name="fldMultiplier" value={formData.fldMultiplier || '1.0000'} onChange={handleChange} className="bg-black text-white px-1 text-right w-full border border-gray-400 p-1" />

              <label className="text-right pr-1">Divider</label>
              <input type="number" step="0.0001" name="fldDivider" value={formData.fldDivider || '1.0000'} onChange={handleChange} className="text-right w-full border border-gray-400 p-1" />
              
              <label className="text-right pr-1">NSE code</label>
              <input name="fldScriptNSE" value={formData.fldScriptNSE || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              
              <label>LotSize</label>
              <input type="number" name="fldLotSize" value={formData.fldLotSize || '1'} onChange={handleChange} className="text-right w-full border border-gray-400 p-1" />

              <label className="text-right pr-1">Fix Margin%</label>
              <input type="number" step="0.0001" name="fldMargin" value={formData.fldMargin || '0.0000'} onChange={handleChange} className="text-right w-full border border-gray-400 p-1" />
              
              <label className="text-right pr-1">MCX code</label>
              <input name="fldScriptMCX" value={formData.fldScriptMCX || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              
              <label>Tick-Price</label>
              <input type="number" step="0.0001" name="fldTP" value={formData.fldTP || '1.0000'} onChange={handleChange} className="text-right w-full border border-gray-400 p-1" />

              <label className="text-right pr-1 whitespace-nowrap">Last closing rate</label>
              <input type="number" step="0.0001" name="fldPrice" value={formData.fldPrice || '0.0000'} onChange={handleChange} className="text-right w-full border border-gray-400 p-1" />
              
              <label className="text-right pr-1">NCDEX code</label>
              <input name="fldScriptNCD" value={formData.fldScriptNCD || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
            </div>

            <div className="mt-8 flex justify-end gap-2">
               <button type="submit" form="scriptForm" className="bg-[#bbd2eb] border border-gray-500 px-6 py-1 text-xs hover:bg-[#a6c1de] shadow-sm">Save Record</button>
            </div>
          </form>
        </div>

        {/* Footer Record Navigation */}
        <div className="bg-gradient-to-r from-[#bbd2eb] to-[#e8ecf1] border-t border-gray-300 px-2 py-1 text-[11px] flex items-center justify-between text-gray-700">
           <div className="flex items-center gap-2">
              Record:  |◄  ◄  <input type="text" className="w-16 text-center border border-gray-300 py-0.5" value="1 of 592" readOnly />  ►  ►|  
           </div>
           <div className="flex items-center gap-2">
             <button className="border border-gray-400 bg-gray-100 px-2 py-0.5 flex gap-1 items-center opacity-50"><span className="scale-75">❌</span> No Filter</button>
             <button className="border border-gray-400 bg-gray-100 px-4 py-0.5">Search</button>
           </div>
        </div>
      </div>
    </div>
  );
}
