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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? `Edit ${groupName}` : `New ${groupName}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-2 bg-gray-50/20">
          {['general', 'brokerage', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          <form id="accountForm" onSubmit={handleSubmit} className="space-y-6 text-black">
            
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5">
                
                {/* Core ID */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Name / Title *</label>
                  <input required name="fldName" value={formData.fldName} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Account Code</label>
                  <input name="fldClient" value={formData.fldClient} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
                </div>

                {groupName !== 'Ledger' && (
                  <>
                    <div className="md:col-span-3 pb-2 pt-2 border-b border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700">Contact Details</h4>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Address</label>
                      <input name="fldAddress" value={formData.fldAddress} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Mobile</label>
                      <input name="fldMobile" value={formData.fldMobile} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Phone Home</label>
                      <input name="fldPhoneH" value={formData.fldPhoneH} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Phone Office</label>
                      <input name="fldPhoneO1" value={formData.fldPhoneO1} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Email</label>
                      <input type="email" name="fldEmail" value={formData.fldEmail} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Reference</label>
                      <input name="fldReference" value={formData.fldReference} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm" />
                    </div>
                  </>
                )}

                {groupName === 'Broker' && (
                  <>
                    <div className="md:col-span-3 pb-2 pt-2 border-b border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700">Broker Identity Defaults</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">PAN Card</label>
                      <input name="fldPAN" value={formData.fldPAN} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono uppercase" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">DP ID</label>
                      <input name="fldDPID" value={formData.fldDPID} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Client ID</label>
                      <input name="fldClientID" value={formData.fldClientID} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
                    </div>
                  </>
                )}

                <div className="md:col-span-3 pb-2 pt-2 border-b border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700">Financials</h4>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Opening Balance</label>
                  <input type="number" step="0.01" name="fldOpening" value={formData.fldOpening} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
                </div>
                {groupName === 'Ledger' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Closing Balance</label>
                    <input type="number" step="0.01" name="fldClosing" value={formData.fldClosing} onChange={handleChange} className="w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white p-2 text-sm shadow-sm font-mono" />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'brokerage' && (
              <div className="p-4 border border-blue-50 bg-blue-50/30 rounded text-sm text-gray-600">
                Brokerage configuration is currently locked for Phase 2.
              </div>
            )}

            {activeTab === 'settings' && (
               <div className="p-4 border border-blue-50 bg-blue-50/30 rounded text-sm text-gray-600">
                 Settings logic specific to flags like Demat Charge, Print Bill, etc., mapped to booleans.
               </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" form="accountForm" className="px-8 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded shadow-sm hover:bg-blue-700 transition">
            Save Record
          </button>
        </div>
      </div>
    </div>
  );
}
