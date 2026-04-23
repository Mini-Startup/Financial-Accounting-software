'use client';
import { useState } from 'react';

export function FormModal({ initialData, groupName, onClose }: { initialData?: any, groupName: string, onClose: () => void }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl w-[650px] rounded-2xl flex flex-col font-sans text-[var(--color-text-main)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-3">
              {initialData ? `Edit ${groupName}` : `Create New ${groupName}`}
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
                <p className="text-title text-[var(--color-primary)]">{formData.fldClient} - {formData.fldName}</p>
              </div>
            </div>
          )}


          <form id="accountForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[100px_1fr_80px_1fr] gap-x-4 gap-y-4 items-center text-sm">
              <label className="text-gray-600 font-medium">Code</label>
              <div className="flex items-center gap-2">
                 <input required name="fldClient" value={formData.fldClient} onChange={handleChange} className="w-24 border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                 {groupName === 'Client' && (
                   <div className="flex items-center gap-2 ml-auto text-xs">
                     <span className="text-gray-500">AOD:</span>
                     <input type="date" className="border border-gray-200 rounded-lg p-1.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                   </div>
                 )}
              </div>

              <label className="text-right pr-2 text-gray-600 font-medium">Home</label>
              <input name="fldTelHome" value={formData.fldPhoneH || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />

              <label className="text-gray-600 font-medium">Name</label>
              <input required name="fldName" value={formData.fldName} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />

              <label className="text-right pr-2 text-gray-600 font-medium">Office</label>
              <input name="fldTelOffice" value={formData.fldPhoneO1 || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />

              <label className="self-start mt-2 text-gray-600 font-medium">Address</label>
              <textarea name="fldAddress" rows={3} value={formData.fldAddress} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-none" />

              <div className="col-span-2 grid grid-cols-[80px_1fr] gap-y-4 items-center self-start">
                  <label className="text-right pr-2 text-gray-600 font-medium">Office 2</label>
                  <input name="fldTelOffice1" value={formData.fldPhoneO2 || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                  
                  <label className="text-right pr-2 text-gray-600 font-medium">Mobile</label>
                  <input name="fldMobile" value={formData.fldMobile} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                  
                  <label className="text-right pr-2 text-gray-600 font-medium">Reference</label>
                  <input name="fldRef" value={formData.fldReference || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              </div>

              <label className="text-gray-600 font-medium">Email</label>
              <input name="fldEmail" type="email" value={formData.fldEmail} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
              
              <div className="col-span-2"></div>
              
              {groupName === 'Broker' && (
                <>
                  <label className="text-gray-600 font-medium">PAN No</label>
                  <input name="fldPAN" value={formData.fldPAN} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                  <div className="col-span-2"></div>
                  
                  <label className="text-gray-600 font-medium">DP ID</label>
                  <input name="fldDPID" value={formData.fldDPID} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                  <div className="col-span-2"></div>
                </>
              )}
            </div>
            
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-gray-100">
               <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
               <button type="submit" form="accountForm" className="btn-primary">Save {groupName}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
