import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { useScrollLock } from '../../hooks/useScrollLock';
import { formatCurrencySymbol } from '@/utils/currency';

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

      const codeUpper = formData.code.trim().toUpperCase();
      let cleanSymbol = formData.symbol.trim();
      if (!cleanSymbol || cleanSymbol === codeUpper || cleanSymbol === 'USD' || cleanSymbol === 'INR') {
        cleanSymbol = formatCurrencySymbol(null, codeUpper);
      }

      const payload = {
        code: codeUpper,
        name: formData.name.trim() || (codeUpper === 'INR' ? 'Indian Rupee' : codeUpper === 'USD' ? 'US Dollar' : codeUpper),
        symbol: cleanSymbol,
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
    const field = e.target.name;
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

    if (field === 'code') {
      const upper = String(value).toUpperCase();
      setFormData((prev: any) => {
        const autoSym = formatCurrencySymbol(null, upper);
        const shouldUpdateSym = !prev.symbol || prev.symbol === 'USD' || prev.symbol === 'INR' || prev.symbol === '$' || prev.symbol === '₹';
        return {
          ...prev,
          code: value,
          symbol: shouldUpdateSym ? autoSym : prev.symbol,
        };
      });
      return;
    }

    setFormData((prev: any) => ({ ...prev, [field]: value }));
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
        {/* Clean Modal Header — No redundant badge */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
              <Coins className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                {initialData ? 'Edit Currency' : 'Create New Currency'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">FX valuation code and monetary symbol formatting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form id="currencyForm" onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-5 space-y-3.5 bg-white">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Currency Code <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={codeInputRef}
                  required
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. USD"
                  className="w-full h-9 px-3 text-xs uppercase font-mono font-bold rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Currency Symbol
                </label>
                <input
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="e.g. $, ₹, د.إ, €"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Currency Full Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. United States Dollar"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 select-none cursor-pointer">
                <CustomCheckbox
                  id="currencyActive"
                  checked={Boolean(formData.isActive)}
                  onChange={(checked) => setFormData((prev: any) => ({ ...prev, isActive: checked }))}
                />
                <span className="font-semibold text-slate-800">
                  Active for trade conversions and settlement ledgers
                </span>
              </label>
            </div>
          </div>

          {/* Unified Modal Footer */}
          <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
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
              form="currencyForm"
              disabled={isSubmitting || !formData.code.trim()}
              className="h-9 px-5 text-xs font-semibold rounded-lg text-white bg-[#2652C8] hover:bg-[#1E42A8] transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Currency' : 'Save Currency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
