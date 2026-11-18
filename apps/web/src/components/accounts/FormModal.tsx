'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X, Building2, Phone, CreditCard, Users2, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useScrollLock } from '../../hooks/useScrollLock';
import { notify } from '@/utils/toastNotify';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { apiFetch } from '../../utils/apiClient';
import { validateAccountForm } from '../../utils/validators';

export function FormModal({
  initialData,
  entityLabel,
  groupName,
  accounts: initialAccounts = [],
  onClose,
  onSuccess,
}: {
  initialData?: any;
  entityLabel: string;
  groupName: string;
  accounts?: any[];
  onClose: () => void;
  onSuccess?: (saved?: any) => void;
}) {
  const router = useRouter();
  const codeInputRef = useRef<HTMLInputElement>(null);
  useScrollLock(true);
  const modalRef = useOutsideClickClose<HTMLDivElement>(onClose);

  const [formData, setFormData] = useState({
    code: initialData?.code || initialData?.fldClient || '',
    name: initialData?.name || initialData?.fldName || '',
    address: initialData?.address || initialData?.fldAddress || '',
    mobileNumber: initialData?.mobileNumber || initialData?.fldMobile || '',
    officeNumber: initialData?.officeNumber || initialData?.fldPhoneO1 || '',
    whatsappNumber: initialData?.whatsappNumber || '',
    isWhatsappSameAsMobile: false,
    email: initialData?.email || initialData?.fldEmail || '',

    contactPersonName: initialData?.contactPersonName || '',
    contactPersonMobile: initialData?.contactPersonMobile || '',
    contactPersonEmail: initialData?.contactPersonEmail || '',

    bankName: initialData?.bankName || '',
    bankBranch: initialData?.bankBranch || '',
    ifscCode: initialData?.ifscCode || '',
    micrCode: initialData?.micrCode || '',
    bankAccountNumber: initialData?.bankAccountNumber || '',
    upiId: initialData?.upiId || '',

    referenceName: initialData?.referenceName || '',
    referenceMobile: initialData?.referenceMobile || '',
    referenceEmail: initialData?.referenceEmail || '',
    isDirectClient: initialData?.isDirectClient ?? true,
    dealerCode: initialData?.dealerCode || '',
    openingBalance: initialData?.openingBalance != null ? initialData.openingBalance : 0,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [directClients, setDirectClients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<any[]>(initialAccounts);

  const fieldLabels: Record<string, string> = {
    code: 'Account Code',
    name: 'Account Name',
    mobileNumber: 'Mobile Number',
    officeNumber: 'Office Phone',
    whatsappNumber: 'WhatsApp Number',
    email: 'Email Address',
    ifscCode: 'IFSC Code',
    contactPersonName: 'Contact Person Name',
    contactPersonMobile: 'Contact Person Mobile',
    contactPersonEmail: 'Contact Person Email',
    referenceName: 'Referred By Name',
    referenceMobile: 'Referral Phone',
  };

  useEffect(() => {
    if (!initialAccounts || initialAccounts.length === 0) {
      const fetchAccounts = async () => {
        try {
          const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/account-masters`);
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
    if (!name) return null;
    return existingAccounts.find((a) => {
      if (initialData?.id && a.id === initialData.id) return false;
      const aGroup = a.group?.name || a.groupName || '';
      if (groupName && aGroup && aGroup.toLowerCase() !== groupName.toLowerCase()) return false;
      return (a.name || '').trim().toUpperCase() === name;
    }) || null;
  }, [formData.name, groupName, existingAccounts, initialData?.id]);

  const isDuplicate = Boolean(duplicateCodeAccount || duplicateNameAccount);

  // Real-time validation errors
  const validationErrors = useMemo(() => {
    return validateAccountForm({
      ...formData,
      groupName: groupName || (formData as any).groupName || (initialData as any)?.groupId || 'Sundry Debtors',
    });
  }, [formData, groupName, initialData]);

  // Spontaneous error detection helper
  const getFieldError = (field: string) => {
    const err = validationErrors[field];
    if (!err) return null;
    const val = formData[field as keyof typeof formData];
    const hasValue = typeof val === 'string' ? val.trim().length > 0 : Boolean(val);
    // Show error if user attempted to submit, or blurred, or if the field currently has a non-empty value (spontaneous feedback as user types!)
    if (hasSubmitted || touched[field] || hasValue) {
      return err;
    }
    return null;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    if (groupName === 'Sundry Debtors') {
      const fetchDirectClients = async () => {
        try {
          const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/account-masters?groupName=Sundry Debtors&directOnly=true`);
          if (res.ok) {
            const data = await res.json();
            setDirectClients(data.filter((c: any) => c.id !== initialData?.id));
          }
        } catch (err) {
          console.error('Failed to fetch direct clients:', err);
        }
      };
      fetchDirectClients();
    }
  }, [groupName, initialData?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    // For phone inputs, if user enters alphabets or characters, trigger spontaneous validation immediately
    const isPhoneField = ['mobileNumber', 'officeNumber', 'whatsappNumber', 'contactPersonMobile', 'referenceMobile'].includes(name);
    if (isPhoneField) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: finalValue,
      };
      if (name === 'mobileNumber' && prev.isWhatsappSameAsMobile) {
        updated.whatsappNumber = finalValue;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);

    // Mark all fields touched
    setTouched({
      code: true,
      name: true,
      mobileNumber: true,
      officeNumber: true,
      whatsappNumber: true,
      email: true,
      ifscCode: true,
      contactPersonMobile: true,
      contactPersonEmail: true,
      referenceMobile: true,
    });

    const activeErrors = validateAccountForm({
      ...formData,
      groupName: groupName || (formData as any).groupName || (initialData as any)?.groupId || 'Sundry Debtors',
    });
    const errorEntries = Object.entries(activeErrors);

    if (errorEntries.length > 0) {
      const errorList = errorEntries.map(([key, msg]) => {
        const fieldName = fieldLabels[key] || key;
        return `${fieldName}: ${msg}`;
      });

      notify.error('Please correct the highlighted errors before saving:', {
        description: errorList.length === 1 ? errorList[0] : undefined,
        errors: errorList.length > 1 ? errorList : undefined,
        duration: 7000,
      });

      // Auto-focus the first invalid field
      const firstKey = errorEntries[0][0];
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    if (isDuplicate) {
      notify.error('Duplicate Account Record', {
        description: 'Cannot save: an account with this code or name already exists.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = initialData?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/account-masters/${initialData.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/account-masters`;
      
      const payload: any = {
        code: formData.code?.trim(),
        name: formData.name?.trim(),
        address: formData.address || null,
        mobileNumber: formData.mobileNumber || null,
        officeNumber: formData.officeNumber || null,
        whatsappNumber: (formData.isWhatsappSameAsMobile ? formData.mobileNumber : formData.whatsappNumber) || null,
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
        referenceName: formData.referenceName || null,
        referenceMobile: formData.referenceMobile || null,
        referenceEmail: formData.referenceEmail || null,
        isDirectClient: Boolean(formData.isDirectClient),
        dealerCode: formData.isDirectClient ? formData.code?.trim() : (formData.dealerCode?.trim() || null),
        openingBalance: formData.openingBalance !== '' && formData.openingBalance != null && !isNaN(Number(formData.openingBalance))
          ? Number(formData.openingBalance)
          : 0,
        groupName: groupName,
      };

      const res = await apiFetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        notify.success(initialData?.id ? `${entityLabel} updated successfully` : `${entityLabel} created successfully`);
        if (onSuccess) {
          onSuccess(saved);
        } else {
          router.refresh();
        }

        if (!initialData?.id) {
          // Rapid entry persistence: reset identifiers, keep modal open
          setFormData((prev) => ({
            ...prev,
            code: '',
            name: '',
            address: '',
            mobileNumber: '',
            officeNumber: '',
            whatsappNumber: '',
            email: '',
            openingBalance: 0,
            contactPersonName: '',
            contactPersonMobile: '',
            contactPersonEmail: '',
            referenceName: '',
            referenceMobile: '',
            referenceEmail: '',
          }));
          setTouched({});
          if (codeInputRef.current) {
            codeInputRef.current.focus();
          }
        } else {
          onClose();
        }
      } else {
        const err = await res.json();
        notify.error(err.message || 'Failed to save account');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error occurred while saving account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {initialData ? `Edit ${entityLabel}` : `Create New ${entityLabel}`}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Group: {groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 4-Quadrant Single-View Grid (Zero-Scroll) */}
        <form id="accountForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto lg:overflow-hidden p-4 space-y-3 flex flex-col justify-between">

          {/* Duplicate Warning */}
          {isDuplicate && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs text-amber-900 shrink-0">
              <span className="font-bold text-amber-950">Notice:</span>
              <span>An account with this code or name already exists in database.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 min-h-0">
            {/* QUADRANT 1: Basic Identifiers & Balance */}
            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60 text-xs font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Account Identifiers</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Code *</label>
                  <input
                    ref={codeInputRef}
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    onBlur={() => handleBlur('code')}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs font-mono rounded-xl border bg-white focus:outline-none transition',
                      getFieldError('code')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950 focus:border-red-600 focus:ring-red-200'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="e.g. CL001"
                  />
                  {getFieldError('code') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('code')}</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => handleBlur('name')}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs rounded-xl border bg-white focus:outline-none transition',
                      getFieldError('name')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950 focus:border-red-600 focus:ring-red-200'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="Account Name"
                  />
                  {getFieldError('name') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('name')}</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    name="openingBalance"
                    value={formData.openingBalance}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">+ for Credit, - for Debit</span>
                </div>

                <div className="flex flex-col justify-center pt-2">
                  {groupName === 'Sundry Debtors' ? (
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <CustomCheckbox
                        checked={Boolean(formData.isDirectClient)}
                        onChange={(checked) => setFormData((prev) => ({ ...prev, isDirectClient: checked }))}
                      />
                      <span className="font-medium text-[11px]">Direct Client</span>
                    </label>
                  ) : null}
                </div>

                {groupName === 'Sundry Debtors' && !formData.isDirectClient && (
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Assigned Dealer</label>
                    <UniversalDropdown
                      value={formData.dealerCode}
                      options={directClients.map((c) => ({
                        value: c.code,
                        label: `${c.code} - ${c.name}`,
                      }))}
                      onChange={(val) => setFormData((prev) => ({ ...prev, dealerCode: val }))}
                      placeholder="-- Select Direct Client --"
                      triggerClassName="h-8 text-xs py-1 rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* QUADRANT 2: Contact Information */}
            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60 text-xs font-bold text-slate-800">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Contact Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Mobile Number</label>
                  <input
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    onBlur={() => handleBlur('mobileNumber')}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs rounded-xl border bg-white focus:outline-none transition',
                      getFieldError('mobileNumber')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950 focus:border-red-600 focus:ring-red-200'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="+91 98765 43210"
                  />
                  {getFieldError('mobileNumber') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('mobileNumber')}</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs rounded-xl border bg-white focus:outline-none transition',
                      getFieldError('email')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950 focus:border-red-600 focus:ring-red-200'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="accounts@client.com"
                  />
                  {getFieldError('email') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('email')}</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">WhatsApp Number</label>
                  <input
                    name="whatsappNumber"
                    value={formData.isWhatsappSameAsMobile ? formData.mobileNumber : formData.whatsappNumber}
                    onChange={handleChange}
                    onBlur={() => handleBlur('whatsappNumber')}
                    disabled={formData.isWhatsappSameAsMobile}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs rounded-xl border bg-white disabled:opacity-60 disabled:bg-slate-100 transition',
                      getFieldError('whatsappNumber')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="WhatsApp No."
                  />
                  {getFieldError('whatsappNumber') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('whatsappNumber')}</span>
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 cursor-pointer">
                    <CustomCheckbox
                      checked={Boolean(formData.isWhatsappSameAsMobile)}
                      onChange={(checked) => setFormData((prev) => ({ ...prev, isWhatsappSameAsMobile: checked }))}
                    />
                    <span>Same as Mobile</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Office Phone</label>
                  <input
                    name="officeNumber"
                    value={formData.officeNumber}
                    onChange={handleChange}
                    onBlur={() => handleBlur('officeNumber')}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs rounded-xl border bg-white transition',
                      getFieldError('officeNumber')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="Office landline"
                  />
                  {getFieldError('officeNumber') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('officeNumber')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QUADRANT 3: Banking Details */}
            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60 text-xs font-bold text-slate-800">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>3. Banking & Settlement</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Bank Name</label>
                  <input
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full h-8 px-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Bank"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Account No.</label>
                  <input
                    name="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={handleChange}
                    className="w-full h-8 px-2 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="A/C No."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">IFSC Code</label>
                  <input
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleChange}
                    onBlur={() => handleBlur('ifscCode')}
                    className={cn(
                      'w-full h-8 px-2 text-xs font-mono uppercase rounded-xl border bg-white transition',
                      getFieldError('ifscCode')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950 focus:border-red-600'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="HDFC0001234"
                  />
                  {getFieldError('ifscCode') && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{getFieldError('ifscCode')}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Branch</label>
                  <input
                    name="bankBranch"
                    value={formData.bankBranch}
                    onChange={handleChange}
                    className="w-full h-8 px-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Branch"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">UPI ID</label>
                  <input
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleChange}
                    className="w-full h-8 px-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="id@upi"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">MICR</label>
                  <input
                    name="micrCode"
                    value={formData.micrCode}
                    onChange={handleChange}
                    className="w-full h-8 px-2 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="MICR"
                  />
                </div>
              </div>
            </div>

            {/* QUADRANT 4: References & Contact Persons */}
            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60 text-xs font-bold text-slate-800">
                <Users2 className="w-3.5 h-3.5 text-blue-600" />
                <span>4. References & Representatives</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Contact Person Name</label>
                  <input
                    name="contactPersonName"
                    value={formData.contactPersonName}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Representative"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Contact Person Mobile</label>
                  <input
                    name="contactPersonMobile"
                    value={formData.contactPersonMobile}
                    onChange={handleChange}
                    onBlur={() => handleBlur('contactPersonMobile')}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs rounded-xl border bg-white transition',
                      getFieldError('contactPersonMobile')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="Phone"
                  />
                  {getFieldError('contactPersonMobile') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('contactPersonMobile')}</span>
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Referred By Name</label>
                  <input
                    name="referenceName"
                    value={formData.referenceName}
                    onChange={handleChange}
                    className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Referral Contact"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Referral Phone</label>
                  <input
                    name="referenceMobile"
                    value={formData.referenceMobile}
                    onChange={handleChange}
                    onBlur={() => handleBlur('referenceMobile')}
                    className={cn(
                      'w-full h-8 px-2.5 text-xs rounded-xl border bg-white transition',
                      getFieldError('referenceMobile')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    )}
                    placeholder="Referral Phone"
                  />
                  {getFieldError('referenceMobile') && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{getFieldError('referenceMobile')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              * Required fields: Code, Name. Immediate spontaneous feedback on invalid inputs.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="accountForm"
                disabled={isSubmitting || isDuplicate}
                className={cn(
                  'px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition flex items-center gap-2 cursor-pointer',
                  isSubmitting || isDuplicate
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-[#2652C8] hover:bg-[#1F42A3]'
                )}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isDuplicate ? (
                  `${entityLabel} Exists`
                ) : initialData?.id ? (
                  `Update ${entityLabel}`
                ) : (
                  `Add ${entityLabel}`
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
