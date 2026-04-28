'use client';

import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="bg-surface border border-border shadow-xl w-[620px] max-w-[95vw] rounded-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-border bg-blue-50/40">
          <h2 className="text-heading-3">{initialData ? 'Edit Ledger' : 'Create New Ledger'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 bg-gray-100/60">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label className="text-sm font-semibold text-gray-800">Account Code</label>
              <input required name="accountCode" value={formData.accountCode} onChange={handleChange} className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label className="text-sm font-semibold text-gray-800">Account Name</label>
              <input required name="accountName" value={formData.accountName} onChange={handleChange} className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label className="text-sm font-semibold text-gray-800">Opening Balance</label>
              <input required type="number" step="any" name="openingBalance" value={formData.openingBalance} onChange={handleChange} className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label className="text-sm font-semibold text-gray-800">Closing Balance</label>
              <input required type="number" step="any" name="closingBalance" value={formData.closingBalance} onChange={handleChange} className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label className="text-sm font-semibold text-gray-800">Account Group</label>
              <select name="accountGroup" value={formData.accountGroup} onChange={handleChange} className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                {GROUP_OPTIONS.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{initialData ? 'Update Ledger' : 'Save Ledger'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

