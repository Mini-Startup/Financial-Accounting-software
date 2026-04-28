'use client';
import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';

export function ExchangeFormModal({ initialData, onClose }: { initialData?: any, onClose: () => void }) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    isActive: initialData?.isActive ?? true,
    ...initialData // Keep ID if passing through
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `http://localhost:4000/exchanges/${initialData.id}` 
        : `http://localhost:4000/exchanges`;
      
      const payload = {
        code: formData.code,
        name: formData.name,
        isActive: formData.isActive
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
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev: any) => ({ ...prev, [e.target.name]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl w-[500px] rounded-2xl flex flex-col font-sans text-[var(--color-text-main)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-3">
              {initialData ? 'Edit Exchange' : 'Create New Exchange'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <form id="exchangeForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-4 items-center text-sm">
              <label className="text-gray-600 font-medium">Code</label>
              <input required name="code" value={formData.code} onChange={handleChange} placeholder="e.g. NSE" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all uppercase" />

              <label className="text-gray-600 font-medium">Name</label>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="National Stock Exchange" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />

              <label className="text-gray-600 font-medium">Active</label>
              <div className="flex items-center">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
              </div>
            </div>
            
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-gray-100">
               <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
               <button type="submit" form="exchangeForm" className="btn-primary">Save Exchange</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
