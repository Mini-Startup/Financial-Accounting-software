'use client';

import { useState, useMemo } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export function AccountMasterFormModal({
  initialData,
  groups,
  onClose,
  onSave,
}: {
  initialData?: any;
  groups: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);

  // Filter out Sundry Debtors and Sundry Creditors
  const allowedGroups = useMemo(() => {
    return groups.filter(g => g.name !== 'Sundry Debtors' && g.name !== 'Sundry Creditors');
  }, [groups]);

  // Find corresponding group name for conditional rendering of Bank Accounts
  const getGroupNameById = (id: number) => {
    const group = groups.find(g => g.id === Number(id));
    return group ? group.name : '';
  };

  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    groupId: initialData?.groupId || (allowedGroups[0]?.id || ''),
    address: initialData?.address || '',
    mobileNumber: initialData?.mobileNumber || '',
    officeNumber: initialData?.officeNumber || '',
    whatsappNumber: initialData?.whatsappNumber || '',
    email: initialData?.email || '',
    contactPersonName: initialData?.contactPersonName || '',
    contactPersonMobile: initialData?.contactPersonMobile || '',
    contactPersonEmail: initialData?.contactPersonEmail || '',
    bankName: initialData?.bankName || '',
    bankBranch: initialData?.bankBranch || '',
    ifscCode: initialData?.ifscCode || '',
    micrCode: initialData?.micrCode || '',
    bankAccountNumber: initialData?.bankAccountNumber || '',
    upiId: initialData?.upiId || '',
  });

  const selectedGroupName = useMemo(() => {
    return getGroupNameById(Number(formData.groupId));
  }, [formData.groupId, groups]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/account-masters/${initialData.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/account-masters`;
      
      const payload = {
        ...formData,
        groupId: Number(formData.groupId),
      };

      const res = await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(initialData ? 'Account master updated' : 'Account master created');
        onSave();
        onClose();
      } else {
        const errData = await res.json();
        toast.error(errData.message || 'Failed to save account master');
      }
    } catch {
      toast.error('Failed to save account master');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="card w-[750px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <div className="card__header bg-[var(--color-snow)]">
          <h2 className="card__title">{initialData ? 'Edit Account Master' : 'Create New Account Master'}</h2>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card__body p-6 space-y-6 overflow-y-auto">
          {/* Basic Account Master Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field">
                <label className="form-label form-label--required">Code</label>
                <input required name="code" value={formData.code} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label form-label--required">Group</label>
                <select name="groupId" value={formData.groupId} onChange={handleChange} className="input">
                  {allowedGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field col-span-2">
                <label className="form-label form-label--required">Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="input" />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Contact Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field col-span-2">
                <label className="form-label">Address</label>
                <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="input resize-none" />
              </div>

              <div className="form-field">
                <label className="form-label">Mobile Number</label>
                <input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label">Office Number</label>
                <input name="officeNumber" value={formData.officeNumber} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label">WhatsApp Number</label>
                <input name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label">Email ID</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} className="input" />
              </div>
            </div>
          </div>

          {/* Contact Person Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Contact Person</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field col-span-2">
                <label className="form-label">Name</label>
                <input name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label">Mobile</label>
                <input name="contactPersonMobile" value={formData.contactPersonMobile} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label">Email</label>
                <input name="contactPersonEmail" type="email" value={formData.contactPersonEmail} onChange={handleChange} className="input" />
              </div>
            </div>
          </div>

          {/* Conditional Bank Accounts Section */}
          {selectedGroupName === 'Bank Accounts' && (
            <div className="space-y-4 border-t border-[var(--color-border-light)] pt-4">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase text-[var(--color-leaf)]">Bank Account Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label form-label--required">Bank Name</label>
                  <input required={selectedGroupName === 'Bank Accounts'} name="bankName" value={formData.bankName} onChange={handleChange} className="input" />
                </div>

                <div className="form-field">
                  <label className="form-label">Branch</label>
                  <input name="bankBranch" value={formData.bankBranch} onChange={handleChange} className="input" />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">IFSC Code</label>
                  <input required={selectedGroupName === 'Bank Accounts'} name="ifscCode" value={formData.ifscCode} onChange={handleChange} className="input" />
                </div>

                <div className="form-field">
                  <label className="form-label">MICR Code</label>
                  <input name="micrCode" value={formData.micrCode} onChange={handleChange} className="input" />
                </div>

                <div className="form-field">
                  <label className="form-label form-label--required">Bank Account Number</label>
                  <input required={selectedGroupName === 'Bank Accounts'} name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className="input" />
                </div>

                <div className="form-field">
                  <label className="form-label">UPI ID</label>
                  <input name="upiId" value={formData.upiId} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
            <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
