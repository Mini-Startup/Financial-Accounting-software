'use client';
import { useState } from 'react';

export function FormModal({ initialData, groupName, onClose }: { initialData?: any, groupName: string, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    mobile: initialData?.mobile || '',
    email: initialData?.email || '',
    pan: initialData?.pan || '',
    openingBalance: initialData?.openingBalance || '',
    ...initialData // Map remaining props automatically
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `http://localhost:4000/accounts/${initialData.id}` 
        : `http://localhost:4000/accounts`;
      
      const payload = {
        ...formData,
        groupName: initialData?.groupId ? undefined : groupName, 
        groupId: initialData?.groupId
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
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
        <div className="p-6 overflow-y-auto flex-1">
          <form id="accountForm" onSubmit={handleSubmit} className="space-y-6 text-black">
            
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name / Title *</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Code</label>
                  <input name="code" value={formData.code} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile</label>
                  <input name="mobile" value={formData.mobile} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow" />
                </div>
              </div>
            )}

            {activeTab === 'brokerage' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Opening Balance</label>
                  <input type="number" name="openingBalance" value={formData.openingBalance} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">PAN Card</label>
                  <input name="pan" value={formData.pan} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow" />
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
               <div className="p-4 border border-blue-50 bg-blue-50/30 rounded-xl text-sm text-gray-600">
                 Settings logic specific to flags like Demat Charge, Print Bill, etc., mapped to booleans.
               </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" form="accountForm" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition">
            Save Record
          </button>
        </div>
      </div>
    </div>
  );
}
