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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-100000 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Unified Modal Header */}
        <div className="px-6 py-4.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  {initialData?.id ? 'Edit Exchange' : 'Create New Exchange'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-[#2652C8] tracking-wider uppercase">
                  Exchange
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Market exchange definition (e.g. SGX, NSE, DGCX)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form id="exchangeForm" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-6 space-y-4 flex-1 bg-white">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Exchange Code <span className="text-rose-500">*</span>
              </label>
              <input
                required
                autoFocus
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. SGX"
                className="w-full h-10 px-3.5 text-sm uppercase font-mono font-bold rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Exchange Full Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Singapore Exchange"
                className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 select-none cursor-pointer">
                <CustomCheckbox
                  id="exchangeActive"
                  checked={Boolean(formData.isActive)}
                  onChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                />
                <span className="font-semibold text-slate-800">
                  Active in trading operations and contract imports
                </span>
              </label>
            </div>
          </div>

          {/* Unified Modal Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="exchangeForm"
              disabled={isSubmitting || !formData.code.trim()}
              className="h-9 px-5 text-xs font-semibold rounded-lg text-white bg-[#2652C8] hover:bg-[#1E42A8] transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Exchange' : 'Save Exchange'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
