'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { CustomSelect } from '../ui/CustomSelect';
import { ExchangeFormModal } from '../exchanges/ExchangeFormModal';
import { CurrencyFormModal } from '../currencies/CurrencyFormModal';

import { useScrollLock } from '../../hooks/useScrollLock';

export function ScriptFormModal({
  initialData,
  exchanges: initialExchanges = [],
  currencies: initialCurrencies = [],
  onClose,
  onSuccess,
}: {
  initialData?: any;
  exchanges: any[];
  currencies?: any[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  useScrollLock(true);
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);

  const [exchanges, setExchanges] = useState<any[]>(initialExchanges);
  const [currencies, setCurrencies] = useState<any[]>(initialCurrencies);

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const [formData, setFormData] = useState({
    shortName: initialData?.shortName || '',
    fullName: initialData?.fullName || '',
    isin: initialData?.isin || '',
    lotSize: initialData?.lotSize !== undefined && initialData?.lotSize !== null ? initialData.lotSize : 1,
    exchangeId: initialData?.exchangeId || initialData?.exchange?.id || (initialExchanges[0]?.id || ''),
    currencyId: initialData?.currencyId || initialData?.currency?.id || '',
    isActive: initialData?.isActive ?? true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        shortName: initialData.shortName || '',
        fullName: initialData.fullName || '',
        isin: initialData.isin || '',
        lotSize: initialData.lotSize !== undefined && initialData.lotSize !== null ? initialData.lotSize : 1,
        exchangeId: initialData.exchangeId || initialData.exchange?.id || (exchanges[0]?.id || ''),
        currencyId: initialData.currencyId || initialData.currency?.id || '',
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData, exchanges]);

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
        if (!formData.currencyId && data.length > 0) {
          const usd = data.find((c: any) => c.code === 'USD');
          setFormData((prev) => ({ ...prev, currencyId: usd ? usd.id : data[0].id }));
        }
      });
    }
  }, [initialCurrencies]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/scripts/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/scripts`;

      const payload = {
        ...formData,
        lotSize: Number(formData.lotSize),
      };

      const res = await fetch(url, {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(initialData?.id ? 'Script updated' : 'Script created');
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to save script');
      }
    } catch {
      toast.error('Save failed');
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      >
        <div ref={modalRef} className="card w-[600px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          {/* Header */}
          <div className="card__header bg-[var(--color-snow)]">
            <h2 className="card__title">{initialData && initialData.id ? 'Edit Script' : 'Create New Script'}</h2>
            <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="scriptForm" onSubmit={handleSubmit} className="card__body p-6 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Script Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Short Name</label>
                  <input required name="shortName" value={formData.shortName} onChange={handleChange} className="input" placeholder="e.g. GOLD" />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Full Name</label>
                  <input required name="fullName" value={formData.fullName} onChange={handleChange} className="input" placeholder="e.g. GOLD 100 OZ" />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Market Lot / Lot Size</label>
                  <input required type="number" name="lotSize" value={formData.lotSize} onChange={handleChange} className="input font-mono text-right" min="1" />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Exchange</label>
                  <CustomSelect
                    value={formData.exchangeId}
                    options={exchangeOptions}
                    onChange={(val) => setFormData((prev) => ({ ...prev, exchangeId: val }))}
                    placeholder="Select Exchange"
                    onAddClick={() => setShowExchangeModal(true)}
                    addLabel="Add Exchange"
                  />
                </div>

                <div className="form-field col-span-2">
                  <label className="form-label form-label--required">Trade Currency</label>
                  <CustomSelect
                    value={formData.currencyId}
                    options={currencyOptions}
                    onChange={(val) => setFormData((prev) => ({ ...prev, currencyId: val }))}
                    placeholder="Select Currency (e.g. USD, INR)"
                    onAddClick={() => setShowCurrencyModal(true)}
                    addLabel="Add Currency"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
              <button type="button" onClick={onClose} className="btn btn--secondary">
                Cancel
              </button>
              <button type="submit" form="scriptForm" className="btn btn--primary">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>

      {showExchangeModal &&
        createPortal(
          <div onMouseDown={(e) => e.stopPropagation()}>
            <ExchangeFormModal
              onClose={() => setShowExchangeModal(false)}
              onSuccess={async (created?: any) => {
                setShowExchangeModal(false);
                const fresh = await fetchExchanges();
                if (created && created.id) {
                  setFormData((prev) => ({ ...prev, exchangeId: created.id }));
                } else if (fresh.length > 0) {
                  setFormData((prev) => ({ ...prev, exchangeId: fresh[fresh.length - 1].id }));
                }
                toast.success('New Exchange added');
              }}
            />
          </div>,
          document.body
        )}

      {showCurrencyModal &&
        createPortal(
          <div onMouseDown={(e) => e.stopPropagation()}>
            <CurrencyFormModal
              onClose={() => setShowCurrencyModal(false)}
              onSuccess={async (created?: any) => {
                setShowCurrencyModal(false);
                const fresh = await fetchCurrencies();
                if (created && created.id) {
                  setFormData((prev) => ({ ...prev, currencyId: created.id }));
                } else if (fresh.length > 0) {
                  setFormData((prev) => ({ ...prev, currencyId: fresh[fresh.length - 1].id }));
                }
                toast.success('New Currency added');
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
