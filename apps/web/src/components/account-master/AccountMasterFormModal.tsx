'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { UniversalDropdown } from '../ui/UniversalDropdown';

export function AccountMasterFormModal({
  initialData,
  groups,
  accounts: initialAccounts = [],
  onClose,
  onSave,
}: {
  initialData?: any;
  groups: any[];
  accounts?: any[];
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
    openingBalance: initialData?.openingBalance ?? 0,
  });

  const selectedGroupName = useMemo(() => {
    return getGroupNameById(Number(formData.groupId));
  }, [formData.groupId, groups]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<any[]>(initialAccounts);

  useEffect(() => {
    if (!initialAccounts || initialAccounts.length === 0) {
      const fetchAccounts = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters`);
          if (res.ok) {
            const data = await res.json();
            setExistingAccounts(data);
          }
        } catch (err) {
          console.error('Failed to fetch accounts:', err);
        }
      };
      fetchAccounts();
    }
  }, [initialAccounts]);

  const duplicateCodeAccount = useMemo(() => {
    const code = (formData.code || '').trim().toUpperCase();
    if (!code) return null;
    return existingAccounts.find((a) => {
      if (initialData?.id && a.id === initialData.id) return false;
      return (a.code || '').trim().toUpperCase() === code;
    }) || null;
  }, [formData.code, existingAccounts, initialData?.id]);

  const duplicateNameAccount = useMemo(() => {
    const name = (formData.name || '').trim().toUpperCase();
    const gId = Number(formData.groupId);
    if (!name || !gId) return null;
    return existingAccounts.find((a) => {
      if (initialData?.id && a.id === initialData.id) return false;
      if (a.groupId !== gId) return false;
      return (a.name || '').trim().toUpperCase() === name;
    }) || null;
  }, [formData.name, formData.groupId, existingAccounts, initialData?.id]);

  const isDuplicate = Boolean(duplicateCodeAccount || duplicateNameAccount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const url = initialData?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/account-masters/${initialData.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/account-masters`;
      
      const payload = {
        code: formData.code?.trim(),
        name: formData.name?.trim(),
        groupId: Number(formData.groupId),
        address: formData.address || null,
        mobileNumber: formData.mobileNumber || null,
        officeNumber: formData.officeNumber || null,
        whatsappNumber: formData.whatsappNumber || null,
        email: formData.email || null,
        contactPersonName: formData.contactPersonName || null,
        contactPersonMobile: formData.contactPersonMobile || null,
        contactPersonEmail: formData.contactPersonEmail || null,
        bankName: formData.bankName || null,
        bankBranch: formData.bankBranch || null,
        ifscCode: formData.ifscCode || null,
        micrCode: formData.micrCode || null,
        bankAccountNumber: formData.bankAccountNumber || null,
        upiId: formData.upiId || null,
        openingBalance: formData.openingBalance !== '' && formData.openingBalance != null && !isNaN(Number(formData.openingBalance))
          ? Number(formData.openingBalance)
          : 0,
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
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to save account master');
      }
    } catch {
      toast.error('Failed to save account master');
    } finally {
      setIsSubmitting(false);
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
          {/* Duplicate Warning Banner */}
          {isDuplicate && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
              <div className="space-y-0.5">
                <div className="font-bold text-amber-950">Account Master Already Exists</div>
                <div className="text-[11px] text-amber-850">
                  {duplicateCodeAccount && (
                    <p>An account with code <strong>&quot;{formData.code.trim()}&quot;</strong> already exists ({duplicateCodeAccount.name}).</p>
                  )}
                  {duplicateNameAccount && (
                    <p>An account with name <strong>&quot;{formData.name.trim()}&quot;</strong> already exists in this group.</p>
                  )}
                  Duplicate entries are blocked.
                </div>
              </div>
            </div>
          )}

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
                <UniversalDropdown
                  value={String(formData.groupId)}
                  options={allowedGroups.map((g) => ({
                    value: String(g.id),
                    label: g.name,
                  }))}
                  onChange={(val) => setFormData((prev) => ({ ...prev, groupId: Number(val) }))}
                  placeholder="Select Group"
                />
              </div>

              <div className="form-field">
                <label className="form-label form-label--required">Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="input" />
              </div>

              <div className="form-field">
                <label className="form-label">Opening Balance</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="openingBalance" 
                  value={formData.openingBalance} 
                  onChange={handleChange} 
                  className="input font-mono" 
                  placeholder="0.00"
                />
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
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn--secondary">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting || isDuplicate || !formData.code?.trim() || !formData.name?.trim()}
              className="btn btn--primary flex items-center gap-2 min-w-[110px] justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:border-slate-400"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : isDuplicate ? (
                'Account Exists'
              ) : initialData?.id ? (
                'Update Account'
              ) : (
                'Add Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
