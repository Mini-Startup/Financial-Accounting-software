'use client';
import { useState } from 'react';

export function FormModal({ initialData, groupName, onClose }: { initialData?: any, groupName: string, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    fldClient: initialData?.fldClient || '',
    fldName: initialData?.fldName || '',
    fldAOD: initialData?.fldAOD || '',
    fldAddress: initialData?.fldAddress || '',
    fldEmail: initialData?.fldEmail || '',
    fldReference: initialData?.fldReference || '',
    fldPhoneH: initialData?.fldPhoneH || '',
    fldPhoneO1: initialData?.fldPhoneO1 || '',
    fldPhoneO2: initialData?.fldPhoneO2 || '',
    fldMobile: initialData?.fldMobile || '',
    fldOpening: initialData?.fldOpening || '',
    fldClosing: initialData?.fldClosing || '',
    fldPAN: initialData?.fldPAN || '',
    fldDPID: initialData?.fldDPID || '',
    fldClientID: initialData?.fldClientID || '',
    ...initialData // Keep ID if passing through
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `http://localhost:4000/accounts/${initialData.id}` 
        : `http://localhost:4000/accounts`;
      
      const payload = {
        ...formData,
        groupName: initialData?.fldGroupNo ? undefined : groupName, 
      };
      
      await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      {/* Desktop MDI Window Simulation */}
      <div className="bg-[#e8ecf1] shadow-2xl w-[650px] border-2 border-blue-300 rounded-sm flex flex-col font-sans text-black pointer-events-auto overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#bbd2eb] to-[#e8ecf1] px-2 py-1 flex justify-between items-center border-b border-gray-300 cursor-move">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-3 h-3 bg-white border border-gray-400 inline-block"></span>
            {groupName} Information
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-black hover:bg-red-200 px-2 py-0.5 rounded transition">
            ✕
          </button>
        </div>

        {/* Global Header inside Window */}
        <div className="p-3 bg-[#e8ecf1]">
          <div className="bg-white border border-gray-300 px-3 py-1 text-center font-bold text-sm text-blue-900 mx-1 mb-2">
            {initialData ? `${formData.fldClient} : ${formData.fldName}` : `Create New ${groupName}`}
          </div>

          {/* Tab Strip */}
          <div className="flex border-b border-gray-400 mb-4 px-2 space-x-1">
            <div className="bg-white px-3 py-1 text-xs border border-b-0 border-gray-400 cursor-default shadow-[0_-1px_0_0_rgba(0,0,0,0.1)]">General</div>
            {(groupName === 'Client' || groupName === 'Broker') && (
              <>
                <div className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer">Brokerage</div>
                <div className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer">Settings</div>
              </>
            )}
          </div>

          <form id="accountForm" onSubmit={handleSubmit} className="px-2 pb-4">
            <div className="grid grid-cols-[100px_1fr_80px_1fr] gap-x-2 gap-y-2 items-center text-xs font-semibold">
              <label>Code</label>
              <div className="flex items-center gap-2">
                 <input required name="fldClient" value={formData.fldClient} onChange={handleChange} className="w-24 border border-gray-400 p-1" />
                 {groupName === 'Client' && (
                   <div className="flex items-center gap-2 ml-auto text-[11px] font-normal">
                     <span>AOD:</span>
                     <input type="date" className="border border-gray-400 p-0.5" />
                   </div>
                 )}
              </div>

              {/* Right column items usually span */}
              <label className="text-right pr-2">Home</label>
              <input name="fldTelHome" value={formData.fldPhoneH || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />

              <label>Name</label>
              <input required name="fldName" value={formData.fldName} onChange={handleChange} className="w-full border border-gray-400 p-1" />

              <label className="text-right pr-2">Office</label>
              <input name="fldTelOffice" value={formData.fldPhoneO1 || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />

              {/* Address spans multiple rows */}
              <label className="self-start mt-1">Address</label>
              <textarea name="fldAddress" rows={3} value={formData.fldAddress} onChange={handleChange} className="w-full border border-gray-400 p-1 resize-none" />

              <div className="col-span-2 grid grid-cols-[80px_1fr] gap-y-2 items-center self-start">
                  <label className="text-right pr-2">Office 2</label>
                  <input name="fldTelOffice1" value={formData.fldPhoneO2 || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
                  
                  <label className="text-right pr-2">Mobile</label>
                  <input name="fldMobile" value={formData.fldMobile} onChange={handleChange} className="w-full border border-gray-400 p-1" />
                  
                  <label className="text-right pr-2">Reference</label>
                  <input name="fldRef" value={formData.fldReference || ''} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              </div>

              <label>E - mail</label>
              <input name="fldEmail" value={formData.fldEmail} onChange={handleChange} className="w-full border border-gray-400 p-1" />
              
              {/* Force empty column padding */}
              <div className="col-span-2"></div>
              
              {groupName === 'Broker' && (
                <>
                  <label>PAN No</label>
                  <input name="fldPAN" value={formData.fldPAN} onChange={handleChange} className="w-full border border-gray-400 p-1" />
                  <div className="col-span-2"></div>
                  
                  <label>DP ID</label>
                  <input name="fldDPID" value={formData.fldDPID} onChange={handleChange} className="w-full border border-gray-400 p-1" />
                  <div className="col-span-2"></div>
                </>
              )}
            </div>
            <div className="mt-8 flex justify-end gap-2">
               <button type="submit" form="accountForm" className="bg-[#bbd2eb] border border-gray-500 px-6 py-1 text-xs hover:bg-[#a6c1de] shadow-sm">Save Record</button>
            </div>
          </form>
        </div>

        {/* Footer Record Navigation */}
        <div className="bg-gradient-to-r from-[#bbd2eb] to-[#e8ecf1] border-t border-gray-300 px-2 py-1 text-[11px] flex items-center justify-between text-gray-700">
           <div className="flex items-center gap-2">
              Record:  |◄  ◄  <input type="text" className="w-16 text-center border border-gray-300 py-0.5" value="1 of 32" readOnly />  ►  ►|  
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
