import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { useScrollLock } from '../../hooks/useScrollLock';

export function CurrencyFormModal({
  initialData,
  onClose,
  onSuccess,
}: {
  initialData?: any;
  onClose: () => void;
  onSuccess?: (created?: any) => void;
}) {
  useScrollLock(true);
  const router = useRouter();
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    symbol: initialData?.symbol || '',
    isActive: initialData?.isActive ?? true,
    ...initialData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = initialData?.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/currencies/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/currencies`;

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        symbol: formData.symbol.trim(),
        isActive: formData.isActive,
      };

      const res = await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Save failed');
      }

      const savedData = await res.json();
      toast.success(initialData?.id ? 'Currency updated' : `Currency '${payload.code}' created successfully`);

      if (onSuccess) {
        onSuccess(savedData);
      } else {
        router.refresh();
      }

      if (initialData?.id) {
        onClose();
      } else {
        // Keep modal open for next entry
        setFormData({
          code: '',
          name: '',
          symbol: '',
          isActive: true,
        });
        setTimeout(() => codeInputRef.current?.focus(), 50);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Save failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev: any) => ({ ...prev, [e.target.name]: value }));
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    >
      <div ref={modalRef} className="card w-[500px] max-w-[95vw] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)]">
          <div className="flex items-center gap-2">
            <h2 className="card__title">
              {initialData ? 'Edit Currency' : 'Create New Currency'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card__body p-6">
          <form id="currencyForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-4 items-center text-sm">
              <label className="form-label">Code</label>
              <input ref={codeInputRef} required name="code" value={formData.code} onChange={handleChange} placeholder="e.g. USD" className="input uppercase" />

              <label className="form-label">Name</label>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="US Dollar" className="input" />

              <label className="form-label">Symbol</label>
              <input name="symbol" value={formData.symbol} onChange={handleChange} placeholder="e.g. $, ₹, د.إ" className="input" />

              <label className="form-label">Active</label>
              <div className="flex items-center">
                <CustomCheckbox
                  checked={Boolean(formData.isActive)}
                  onChange={(checked) => setFormData((prev: any) => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>
            
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
               <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
               <button type="submit" form="currencyForm" disabled={isSubmitting} className="btn btn--primary">
                 {isSubmitting ? 'Saving...' : 'Save Currency'}
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
