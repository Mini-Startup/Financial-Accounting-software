'use client';

import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';

export function ScriptFormModal({
  initialData,
  exchanges,
  onClose,
  onSuccess,
}: {
  initialData?: any;
  exchanges: any[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);

  const [formData, setFormData] = useState({
    shortName: initialData?.shortName || '',
    fullName: initialData?.fullName || '',
    isin: initialData?.isin || '',
    lotSize: initialData?.lotSize || 1,
    isActive: initialData?.isActive ?? true,
  });

  // Load existing exchange mappings if editing
  const [exchangeMappings, setExchangeMappings] = useState<Array<{ exchangeId: string; exchangeScriptCode: string }>>(
    initialData?.scriptExchangeMappings?.map((m: any) => ({
      exchangeId: m.exchangeId,
      exchangeScriptCode: m.exchangeScriptCode,
    })) || []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddMapping = () => {
    if (exchanges.length === 0) {
      toast.error('No exchanges available to map');
      return;
    }
    setExchangeMappings(prev => [
      ...prev,
      { exchangeId: exchanges[0].id, exchangeScriptCode: '' }
    ]);
  };

  const handleRemoveMapping = (index: number) => {
    setExchangeMappings(prev => prev.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index: number, field: 'exchangeId' | 'exchangeScriptCode', value: string) => {
    setExchangeMappings(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `http://localhost:4000/scripts/${initialData.id}` 
        : `http://localhost:4000/scripts`;
      
      const payload = {
        ...formData,
        lotSize: Number(formData.lotSize),
        exchangeMappings: exchangeMappings.filter(m => m.exchangeScriptCode.trim() !== ''),
      };

      const res = await fetch(url, {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(initialData ? 'Script updated' : 'Script created');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[650px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)]">
          <h2 className="card__title">
            {initialData ? 'Edit Script' : 'Create New Script'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="scriptForm" onSubmit={handleSubmit} className="card__body p-6 space-y-6 overflow-y-auto">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field">
                <label className="form-label form-label--required">Short Name</label>
                <input required name="shortName" value={formData.shortName} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label form-label--required">Lot Size</label>
                <input required type="number" name="lotSize" value={formData.lotSize} onChange={handleChange} className="input font-mono text-right" />
              </div>

              <div className="form-field">
                <label className="form-label form-label--required">Full Name</label>
                <input required name="fullName" value={formData.fullName} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label">ISIN</label>
                <input name="isin" value={formData.isin} onChange={handleChange} className="input" />
              </div>
            </div>
          </div>

          {/* Exchange Mapping Section */}
          <div className="space-y-4 border-t border-[var(--color-border-light)] pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Exchange Mappings</h3>
              <button
                type="button"
                onClick={handleAddMapping}
                className="btn btn--secondary flex items-center gap-1.5 py-1 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Mapping
              </button>
            </div>

            {exchangeMappings.length === 0 ? (
              <p className="text-xs text-[var(--color-slate)] italic">No exchange mappings added yet. Click Add Mapping to link this script.</p>
            ) : (
              <div className="space-y-2">
                {exchangeMappings.map((mapping, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-[var(--color-snow)] p-2 rounded-lg border border-[var(--color-border-light)]">
                    <div className="flex-1">
                      <select
                        value={mapping.exchangeId}
                        onChange={e => handleMappingChange(idx, 'exchangeId', e.target.value)}
                        className="input text-xs"
                      >
                        {exchanges.map(ex => (
                          <option key={ex.id} value={ex.id}>{ex.code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        placeholder="Exchange Code (e.g. RELIANCE)"
                        value={mapping.exchangeScriptCode}
                        onChange={e => handleMappingChange(idx, 'exchangeScriptCode', e.target.value)}
                        className="input text-xs"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
             <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
             <button type="submit" form="scriptForm" className="btn btn--primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
