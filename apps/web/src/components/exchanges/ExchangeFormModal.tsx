'use client';
import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';

export function ExchangeFormModal({ initialData, onClose }: { initialData?: any, onClose: () => void }) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    isActive: initialData?.isActive ?? true,
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/exchanges/${initialData.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/exchanges`;
      
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[500px] max-w-[95vw] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)]">
          <div className="flex items-center gap-2">
            <h2 className="card__title">
              {initialData ? 'Edit Exchange' : 'Create New Exchange'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card__body p-6">
          <form id="exchangeForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-4 items-center text-sm">
              <label className="form-label">Code</label>
              <input required name="code" value={formData.code} onChange={handleChange} placeholder="e.g. NSE" className="input uppercase" />

              <label className="form-label">Name</label>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="National Stock Exchange" className="input" />

              <label className="form-label">Active</label>
              <div className="flex items-center">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-4 h-4 text-[var(--color-forest)] bg-white border-[var(--color-border)] rounded focus:ring-[var(--color-forest)]" />
              </div>
            </div>
            
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
               <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
               <button type="submit" form="exchangeForm" className="btn btn--primary">Save Exchange</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
