'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, AlertTriangle, Coins, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { ExchangeFormModal } from '../exchanges/ExchangeFormModal';
import { CurrencyFormModal } from '../currencies/CurrencyFormModal';
import { useScrollLock } from '../../hooks/useScrollLock';
import { cn } from '@/utils/cn';
import { formatCurrencySymbol } from '@/utils/currency';

export function ScriptFormModal({
  initialData,
  exchanges: initialExchanges = [],
  currencies: initialCurrencies = [],
  scripts: initialScripts = [],
  onClose,
  onSuccess,
}: {
  initialData?: any;
  exchanges: any[];
  currencies?: any[];
  scripts?: any[];
  onClose: () => void;
  onSuccess?: (createdScript?: any) => void;
}) {
  const router = useRouter();
  const shortNameInputRef = useRef<HTMLInputElement>(null);
  useScrollLock(true);
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);

  const [exchanges, setExchanges] = useState<any[]>(initialExchanges);
  const [currencies, setCurrencies] = useState<any[]>(initialCurrencies);
  const [scriptList, setScriptList] = useState<any[]>(initialScripts);

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeModalInitialData, setExchangeModalInitialData] = useState<any>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyModalInitialData, setCurrencyModalInitialData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Target codes from import row (e.g. 'SGX', 'USD')
  const targetExchangeCode = (
    initialData?.targetExchangeCode ||
    (typeof initialData?.exchange === 'string' ? initialData.exchange : initialData?.exchange?.code) ||
    ''
  ).trim();

  const targetCurrencyCode = (
    initialData?.targetCurrencyCode ||
    (typeof initialData?.currency === 'string' ? initialData.currency : initialData?.currency?.code) ||
    'USD'
  ).trim();

  // Helper to find initial exchange ID
  const resolveInitialExchangeId = (exList: any[], initData?: any, targetCode?: string) => {
    if (initData?.exchangeId) return initData.exchangeId;
    if (initData?.exchange?.id) return initData.exchange.id;
    if (targetCode) {
      const match = exList.find((e) => e.code.toUpperCase() === targetCode.toUpperCase());
      if (match) return match.id;
      // If targetCode was explicitly requested and not found, do NOT fallback to arbitrary first exchange!
      return '';
    }
    return exList[0]?.id || '';
  };

  // Helper to find initial currency ID
  const resolveInitialCurrencyId = (curList: any[], initData?: any, targetCode?: string) => {
    if (initData?.currencyId) return initData.currencyId;
    if (initData?.currency?.id) return initData.currency.id;
    if (targetCode) {
      const match = curList.find((c) => c.code.toUpperCase() === targetCode.toUpperCase());
      if (match) return match.id;
    }
    const usd = curList.find((c) => c.code.toUpperCase() === 'USD');
    return usd ? usd.id : (curList[0]?.id || '');
  };

  const [formData, setFormData] = useState({
    shortName: initialData?.shortName || '',
    fullName: initialData?.fullName || '',
    isin: initialData?.isin || '',
    lotSize: String(initialData?.lotSize !== undefined && initialData?.lotSize !== null ? initialData.lotSize : '1'),
    exchangeId: resolveInitialExchangeId(initialExchanges, initialData, targetExchangeCode),
    currencyId: resolveInitialCurrencyId(initialCurrencies, initialData, targetCurrencyCode),
    isActive: initialData?.isActive ?? true,
  });

  const lastInitialIdRef = useRef(initialData?.id);
  useEffect(() => {
    if (initialData && initialData.id !== lastInitialIdRef.current) {
      lastInitialIdRef.current = initialData.id;
      setFormData({
        shortName: initialData.shortName || '',
        fullName: initialData.fullName || '',
        isin: initialData.isin || '',
        lotSize: String(initialData.lotSize !== undefined && initialData.lotSize !== null ? initialData.lotSize : '1'),
        exchangeId: resolveInitialExchangeId(exchanges, initialData, targetExchangeCode),
        currencyId: resolveInitialCurrencyId(currencies, initialData, targetCurrencyCode),
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData, exchanges, currencies, targetExchangeCode, targetCurrencyCode]);

  const fetchScripts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setScriptList(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch scripts:', err);
    }
    return [];
  };

  useEffect(() => {
    if (!initialScripts || initialScripts.length === 0) {
      fetchScripts();
    }
  }, [initialScripts]);

  const duplicateScript = useMemo(() => {
    const sName = (formData.shortName || '').trim().toUpperCase();
    const fName = (formData.fullName || '').trim().toUpperCase();
    const exId = formData.exchangeId;
    if (!sName || !exId) return null;

    return scriptList.find((s) => {
      if (initialData?.id && s.id === initialData.id) return false;
      const sExId = s.exchangeId || s.exchange?.id;
      if (sExId !== exId) return false;
      const matchShort = (s.shortName || '').trim().toUpperCase() === sName;
      const matchFull = fName && (s.fullName || '').trim().toUpperCase() === fName;
      return matchShort || matchFull;
    }) || null;
  }, [formData.shortName, formData.fullName, formData.exchangeId, scriptList, initialData?.id]);

  const isDuplicate = Boolean(duplicateScript);

  const fetchExchanges = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExchanges(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch exchanges:', err);
    }
    return [];
  };

  const fetchCurrencies = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/currencies`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCurrencies(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
    }
    return [];
  };

  useEffect(() => {
    if (!initialCurrencies || initialCurrencies.length === 0) {
      fetchCurrencies().then((data) => {
        setFormData((prev) => {
          if (!prev.currencyId && data.length > 0) {
            const curId = resolveInitialCurrencyId(data, initialData, targetCurrencyCode);
            return { ...prev, currencyId: curId };
          }
          return prev;
        });
      });
    }
    if (!initialExchanges || initialExchanges.length === 0) {
      fetchExchanges().then((data) => {
        setFormData((prev) => {
          if (!prev.exchangeId && data.length > 0) {
            const exId = resolveInitialExchangeId(data, initialData, targetExchangeCode);
            return { ...prev, exchangeId: exId };
          }
          return prev;
        });
      });
    }
  }, [initialCurrencies, initialExchanges, initialData, targetCurrencyCode, targetExchangeCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Check if target exchange is missing
  const isTargetExchangeMissing =
    Boolean(targetExchangeCode) &&
    !exchanges.some((e) => e.code.toUpperCase() === targetExchangeCode.toUpperCase());

  // Check if target currency is missing
  const isTargetCurrencyMissing =
    Boolean(targetCurrencyCode) &&
    currencies.length > 0 &&
    !currencies.some((c) => c.code.toUpperCase() === targetCurrencyCode.toUpperCase());

  const handleOpenAddExchange = () => {
    setExchangeModalInitialData({
      code: targetExchangeCode ? targetExchangeCode.toUpperCase() : '',
      name: targetExchangeCode || '',
    });
    setShowExchangeModal(true);
  };

  const handleOpenAddCurrency = () => {
    const code = targetCurrencyCode ? targetCurrencyCode.toUpperCase() : 'USD';
    setCurrencyModalInitialData({
      code,
      name: targetCurrencyCode || (code === 'INR' ? 'Indian Rupee' : 'US Dollar'),
      symbol: formatCurrencySymbol(null, code),
    });
    setShowCurrencyModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.exchangeId) {
      toast.error(
        targetExchangeCode
          ? `Please add or select Exchange '${targetExchangeCode}' before saving the script.`
          : 'Please select an Exchange for this script.'
      );
      return;
    }

    if (!formData.currencyId) {
      toast.error('Please select a Trade Currency for this script.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = initialData?.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/scripts/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/scripts`;

      const payload = {
        ...formData,
        lotSize: Number(formData.lotSize) || 1,
      };

      const res = await fetch(url, {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json().catch(() => null);
        toast.success(initialData?.id ? 'Script updated successfully' : `Script '${formData.shortName}' created successfully`);
        if (onSuccess) {
          onSuccess(savedData);
        }
        router.refresh();
        if (!initialData?.id) {
          // Rapid entry persistence: preserve exchangeId, currencyId, lotSize; reset name fields
          setFormData((prev) => ({
            ...prev,
            shortName: '',
            fullName: '',
            code: '',
          }));
          setTimeout(() => shortNameInputRef.current?.focus(), 50);
        } else {
          onClose();
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save script');
      }
    } catch {
      toast.error('Save failed due to network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exchangeOptions = exchanges.map((ex) => ({
    value: ex.id,
    label: `${ex.code} ${ex.name ? `(${ex.name})` : ''}`,
  }));

  const currencyOptions = currencies.map((c) => ({
    value: c.id,
    label: `${c.code} ${c.symbol ? `(${c.symbol})` : ''} - ${c.name || ''}`,
  }));

  return (
    <>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      >
        <div
          ref={modalRef}
          className="card w-[620px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none animate-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="card__header bg-[var(--color-snow)] flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="card__title text-base font-bold text-slate-800">
                {initialData && initialData.id ? 'Edit Script Master' : 'Create New Script Master'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define security symbol, exchange linkage, and contract specifications
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="scriptForm" onSubmit={handleSubmit} className="card__body p-6 space-y-5 overflow-y-auto">
            {/* Warning Banner: Exchange Missing from Database */}
            {isTargetExchangeMissing && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-900">Exchange &apos;{targetExchangeCode}&apos; Not Found in Database</div>
                    <div className="text-[11px] text-rose-700 mt-0.5">
                      This trade record belongs to exchange <strong>{targetExchangeCode}</strong>, which must be added before saving.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddExchange}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exchange &apos;{targetExchangeCode}&apos;</span>
                </button>
              </div>
            )}

            {/* Warning Banner: Currency Missing from Database */}
            {isTargetCurrencyMissing && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <Coins className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-900">Currency &apos;{targetCurrencyCode}&apos; Not Found</div>
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      Add currency <strong>{targetCurrencyCode}</strong> to properly calibrate trade profit and rates.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddCurrency}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Currency &apos;{targetCurrencyCode}&apos;</span>
                </button>
              </div>
            )}

            {/* Warning Banner: Duplicate Script in Database */}
            {isDuplicate && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-950">Script Already Exists in Database</div>
                  <div className="text-[11px] text-amber-800">
                    A script with symbol <strong>&quot;{formData.shortName.trim()}&quot;</strong> or name <strong>&quot;{formData.fullName.trim()}&quot;</strong> already exists on the selected exchange. Duplicate entries are blocked.
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">
                Script Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required text-xs font-semibold text-slate-700">Short Name / Tick Code</label>
                  <input
                    ref={shortNameInputRef}
                    required
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleChange}
                    className="input text-xs font-mono font-bold uppercase"
                    placeholder="e.g. GIN, GOLD"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required text-xs font-semibold text-slate-700">Market Lot / Lot Size</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    name="lotSize"
                    value={formData.lotSize}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setFormData((prev) => ({ ...prev, lotSize: val }));
                    }}
                    onBlur={() => {
                      if (!formData.lotSize || parseInt(formData.lotSize, 10) < 1) {
                        setFormData((prev) => ({ ...prev, lotSize: '1' }));
                      }
                    }}
                    className="input text-xs font-mono text-right font-bold"
                    placeholder="1"
                  />
                  <p className="form-hint text-[10px]">Positive integer (defaults to 1)</p>
                </div>

                <div className="form-field col-span-2">
                  <label className="form-label form-label--required text-xs font-semibold text-slate-700">Full Security Name</label>
                  <input
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="input text-xs"
                    placeholder="e.g. GIFT CONN NIFTY 50 IND"
                  />
                </div>

                {/* Exchange Select */}
                <div className="form-field">
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label form-label--required text-xs font-semibold text-slate-700">
                      Primary Exchange
                    </label>
                    {targetExchangeCode && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          formData.exchangeId ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        Target: {targetExchangeCode}
                      </span>
                    )}
                  </div>
                  <div className={isTargetExchangeMissing || !formData.exchangeId ? 'rounded-lg border-2 border-rose-300' : ''}>
                    <UniversalDropdown
                      value={formData.exchangeId}
                      options={exchangeOptions}
                      onChange={(val) => setFormData((prev) => ({ ...prev, exchangeId: val }))}
                      placeholder={
                        isTargetExchangeMissing
                          ? `⚠️ Add '${targetExchangeCode}' first`
                          : 'Select Exchange'
                      }
                      onAddClick={handleOpenAddExchange}
                      addLabel={targetExchangeCode ? `Add '${targetExchangeCode}'` : 'Add Exchange'}
                    />
                  </div>
                </div>

                {/* Currency Select */}
                <div className="form-field">
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label form-label--required text-xs font-semibold text-slate-700">
                      Trade Currency
                    </label>
                    {targetCurrencyCode && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        Target: {targetCurrencyCode}
                      </span>
                    )}
                  </div>
                  <UniversalDropdown
                    value={formData.currencyId}
                    options={currencyOptions}
                    onChange={(val) => setFormData((prev) => ({ ...prev, currencyId: val }))}
                    placeholder="Select Currency (e.g. USD, INR)"
                    onAddClick={handleOpenAddCurrency}
                    addLabel={targetCurrencyCode ? `Add '${targetCurrencyCode}'` : 'Add Currency'}
                  />
                </div>

                <div className="form-field col-span-2">
                  <label className="form-label text-xs font-semibold text-slate-700">ISIN Code (Optional)</label>
                  <input
                    name="isin"
                    value={formData.isin}
                    onChange={handleChange}
                    className="input text-xs font-mono"
                    placeholder="e.g. INE123A01012"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn--secondary text-xs py-2 px-3">
                Cancel
              </button>
              <button
                type="submit"
                form="scriptForm"
                disabled={isSubmitting || isDuplicate || !formData.exchangeId || !formData.currencyId || !formData.shortName.trim()}
                className={cn(
                  "btn btn--primary text-xs py-2 px-4 shadow-xs flex items-center gap-1.5",
                  (isDuplicate || !formData.exchangeId) && "opacity-60 cursor-not-allowed bg-slate-400 border-slate-400 hover:bg-slate-400"
                )}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isDuplicate ? (
                  'Script Already Exists'
                ) : initialData && initialData.id ? (
                  'Update Script'
                ) : (
                  'Add Script'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Exchange Sub-modal */}
      {showExchangeModal &&
        createPortal(
          <div onMouseDown={(e) => e.stopPropagation()}>
            <ExchangeFormModal
              initialData={exchangeModalInitialData}
              onClose={() => setShowExchangeModal(false)}
              onSuccess={async (created?: any) => {
                setShowExchangeModal(false);
                const fresh = await fetchExchanges();
                if (created && created.id) {
                  setFormData((prev) => ({ ...prev, exchangeId: created.id }));
                  toast.success(`Exchange '${created.code}' linked and selected`);
                } else if (targetExchangeCode) {
                  const match = fresh.find(
                    (ex: any) => ex.code.toUpperCase() === targetExchangeCode.toUpperCase()
                  );
                  if (match) {
                    setFormData((prev) => ({ ...prev, exchangeId: match.id }));
                    toast.success(`Exchange '${match.code}' linked and selected`);
                  } else if (fresh.length > 0) {
                    setFormData((prev) => ({ ...prev, exchangeId: fresh[fresh.length - 1].id }));
                  }
                }
              }}
            />
          </div>,
          document.body
        )}

      {/* Currency Sub-modal */}
      {showCurrencyModal &&
        createPortal(
          <div onMouseDown={(e) => e.stopPropagation()}>
            <CurrencyFormModal
              initialData={currencyModalInitialData}
              onClose={() => setShowCurrencyModal(false)}
              onSuccess={async (created?: any) => {
                setShowCurrencyModal(false);
                const fresh = await fetchCurrencies();
                if (created && created.id) {
                  setFormData((prev) => ({ ...prev, currencyId: created.id }));
                  toast.success(`Currency '${created.code}' linked and selected`);
                } else if (targetCurrencyCode) {
                  const match = fresh.find(
                    (c: any) => c.code.toUpperCase() === targetCurrencyCode.toUpperCase()
                  );
                  if (match) {
                    setFormData((prev) => ({ ...prev, currencyId: match.id }));
                    toast.success(`Currency '${match.code}' linked and selected`);
                  } else if (fresh.length > 0) {
                    setFormData((prev) => ({ ...prev, currencyId: fresh[fresh.length - 1].id }));
                  }
                }
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
