'use client';

import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';

const GROUP_OPTIONS = [
  'Sundry Debtors',
  'Sundry Creditors',
  'Income Accounts',
  'Expense Accounts',
  'Bank Accounts',
  'Cash Accounts',
];

export function LedgerFormModal({
  initialData,
  onClose,
  onSave,
}: {
  initialData?: any;
  onClose: () => void;
  onSave: (ledger: any) => void;
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);
  const [formData, setFormData] = useState({
    accountCode: initialData?.accountCode || '',
    accountName: initialData?.accountName || '',
    openingBalance: initialData?.openingBalance || '',
    closingBalance: initialData?.closingBalance || '',
    accountGroup: initialData?.accountGroup || 'Sundry Debtors',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || crypto.randomUUID(),
      ...formData,
      openingBalance: Number(formData.openingBalance || 0),
      closingBalance: Number(formData.closingBalance || 0),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[620px] max-w-[95vw] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <div className="card__header bg-[var(--color-snow)]">
          <h2 className="card__title">{initialData ? 'Edit Ledger' : 'Create New Ledger'}</h2>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card__body p-6 space-y-4">
          <div className="form-field">
            <label className="form-label form-label--required">Account Code</label>
            <input required name="accountCode" value={formData.accountCode} onChange={handleChange} className="input" />
          </div>

          <div className="form-field">
            <label className="form-label form-label--required">Account Name</label>
            <input required name="accountName" value={formData.accountName} onChange={handleChange} className="input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-field">
              <label className="form-label form-label--required">Opening Balance</label>
              <input required type="number" step="any" name="openingBalance" value={formData.openingBalance} onChange={handleChange} className="input" />
            </div>

            <div className="form-field">
              <label className="form-label form-label--required">Closing Balance</label>
              <input required type="number" step="any" name="closingBalance" value={formData.closingBalance} onChange={handleChange} className="input" />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label form-label--required">Account Group</label>
            <select name="accountGroup" value={formData.accountGroup} onChange={handleChange} className="input">
              {GROUP_OPTIONS.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
            <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
            <button type="submit" className="btn btn--primary">{initialData ? 'Update Ledger' : 'Save Ledger'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
