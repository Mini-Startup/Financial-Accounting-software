'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CustomCheckbox } from '../ui/CustomCheckbox';

export function ExchangeFormModal({
  initialData,
  onClose,
  onSuccess,
}: {
  initialData?: any;
  onClose: () => void;
  onSuccess?: (saved?: any) => void;
}) {
  useScrollLock(true);
  const router = useRouter();
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || initialData?.code || '',
    isActive: initialData?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || initialData.code || '',
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = initialData?.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/exchanges/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/exchanges`;

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim() || formData.code.trim().toUpperCase(),
        isActive: formData.isActive,
      };

      const res = await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        toast.success(initialData?.id ? 'Exchange updated' : `Exchange '${payload.code}' created successfully`);
        if (onSuccess) {
          onSuccess(saved);
        } else {
          router.refresh();
        }

        if (initialData?.id) {
          onClose();
        } else {
          setFormData({
            code: '',
            name: '',
            isActive: true,
          });
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Save failed.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Save failed: ' + (err.message || 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev: any) => ({ ...prev, [e.target.name]: value }));
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="card w-[480px] max-w-[95vw] flex flex-col p-0 overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)] flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100/70 text-emerald-800 rounded-md">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {initialData?.id ? 'Edit Exchange' : 'Create New Exchange'}
              </h2>
              <p className="text-[11px] text-slate-500">Market exchange definition (e.g. SGX, NSE, DGCX)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="card__body p-6">
          <form id="exchangeForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Exchange Code <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  autoFocus
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. SGX"
                  className="input uppercase font-mono font-bold w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exchange Full Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Singapore Exchange"
                  className="input w-full text-xs py-2"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <CustomCheckbox
                  id="exchangeActive"
                  checked={Boolean(formData.isActive)}
                  onChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                />
                <label htmlFor="exchangeActive" className="text-slate-700 select-none cursor-pointer font-medium text-xs">
                  Active in trading and imports
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 flex justify-end gap-2.5 border-t border-[var(--color-border-light)]">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn--secondary text-xs py-2 px-3">
                Cancel
              </button>
              <button
                type="submit"
                form="exchangeForm"
                disabled={isSubmitting}
                className="btn btn--primary text-xs py-2 px-4 shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Exchange'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
