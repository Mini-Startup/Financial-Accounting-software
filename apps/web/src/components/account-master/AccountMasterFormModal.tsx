'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, Loader2 } from 'lucide-react';
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
    const group = groups.find(g => g.id === Number(formData.groupId));
    return group ? group.name : '';
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
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Unified Modal Header */}
        <div className="px-6 py-4.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
              <span className="text-xs font-bold font-mono">GL</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  {initialData ? 'Edit Account Master' : 'Create New Account Master'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-[#2652C8] tracking-wider uppercase">
                  Master
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                General ledger accounts, banking parameters, and contact directory
              </p>
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
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
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase pb-1.5 border-b border-slate-100">
                1. Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Account Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g. ACC-001"
                    className="w-full h-10 px-3.5 text-sm font-mono uppercase rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Account Group <span className="text-rose-500">*</span>
                  </label>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Account Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="openingBalance"
                    value={formData.openingBalance}
                    onChange={handleChange}
                    className="w-full h-10 px-3.5 text-sm font-mono rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase pb-1.5 border-b border-slate-100">
                2. Contact Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Full Address
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter postal street address, office or flat number..."
                    className="w-full p-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Office Number
                  </label>
                  <input
                    name="officeNumber"
                    value={formData.officeNumber}
                    onChange={handleChange}
                    placeholder="022-12345678"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    WhatsApp Number
                  </label>
                  <input
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="account@example.com"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Contact Person Details */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase pb-1.5 border-b border-slate-100">
                3. Contact Person
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Person Name
                  </label>
                  <input
                    name="contactPersonName"
                    value={formData.contactPersonName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Direct Mobile
                  </label>
                  <input
                    name="contactPersonMobile"
                    value={formData.contactPersonMobile}
                    onChange={handleChange}
                    placeholder="+91 98765 00000"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    name="contactPersonEmail"
                    type="email"
                    value={formData.contactPersonEmail}
                    onChange={handleChange}
                    placeholder="person@example.com"
                    className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Conditional Bank Accounts Section */}
            {selectedGroupName === 'Bank Accounts' && (
              <div className="space-y-3.5 pt-2">
                <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase pb-1.5 border-b border-slate-100">
                  4. Bank Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required={selectedGroupName === 'Bank Accounts'}
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      placeholder="e.g. State Bank of India"
                      className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Branch
                    </label>
                    <input
                      name="bankBranch"
                      value={formData.bankBranch}
                      onChange={handleChange}
                      placeholder="e.g. Nariman Point, Mumbai"
                      className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      IFSC Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required={selectedGroupName === 'Bank Accounts'}
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      placeholder="e.g. SBIN0001234"
                      className="w-full h-10 px-3.5 text-sm font-mono uppercase rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      MICR Code
                    </label>
                    <input
                      name="micrCode"
                      value={formData.micrCode}
                      onChange={handleChange}
                      placeholder="9-digit MICR code"
                      className="w-full h-10 px-3.5 text-sm font-mono rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Bank Account Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required={selectedGroupName === 'Bank Accounts'}
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={handleChange}
                      placeholder="Enter account number"
                      className="w-full h-10 px-3.5 text-sm font-mono rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      UPI ID / VPA
                    </label>
                    <input
                      name="upiId"
                      value={formData.upiId}
                      onChange={handleChange}
                      placeholder="name@okaxis"
                      className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2652C8] focus:ring-2 focus:ring-[#2652C8]/15 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
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
              disabled={isSubmitting || isDuplicate || !formData.code?.trim() || !formData.name?.trim()}
              className="h-9 px-5 text-xs font-semibold text-white bg-[#2652C8] hover:bg-[#1E42A8] rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
