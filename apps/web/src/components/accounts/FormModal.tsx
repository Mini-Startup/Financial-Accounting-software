'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

import { useScrollLock } from '../../hooks/useScrollLock';

import { toast } from 'sonner';

export function FormModal({
  initialData,
  entityLabel,
  groupName,
  onClose,
  onSuccess,
}: {
  initialData?: any;
  entityLabel: string;
  groupName: string;
  onClose: () => void;
  onSuccess?: () => void;
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

  const [directClients, setDirectClients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (groupName === 'Sundry Debtors') {
      const fetchDirectClients = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters?group=Sundry Debtors&directOnly=true`);
          if (res.ok) {
            const data = await res.json();
            // Filter out current client if editing
            const filtered = data.filter((c: any) => c.id !== initialData?.id);
            setDirectClients(filtered);
          }
        } catch (err) {
          console.error('Failed to fetch direct clients:', err);
        }
      };
      fetchDirectClients();
    }
  }, [groupName, initialData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const url = initialData?.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/account-masters/${initialData.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/account-masters`;
      
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

      const res = await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(initialData?.id ? `${entityLabel} updated successfully` : `${entityLabel} created successfully`);
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();

        if (!initialData?.id) {
          // Rapid entry persistence: reset identifiers and details, keep modal open
          setFormData((prev) => ({
            ...prev,
            code: '',
            name: '',
            address: '',
            mobileNumber: '',
            officeNumber: '',
            whatsappNumber: '',
            isWhatsappSameAsMobile: false,
            email: '',
            openingBalance: 0,
            contactPersonName: '',
            contactPersonMobile: '',
            contactPersonEmail: '',
            bankName: '',
            bankBranch: '',
            ifscCode: '',
            micrCode: '',
            bankAccountNumber: '',
            upiId: '',
          }));
          setTimeout(() => codeInputRef.current?.focus(), 50);
        } else {
          onClose();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Save failed.');
      }
    } catch(err) {
      console.error(err);
      toast.error('Network or server error while saving account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (updated.isDirectClient) {
        updated.dealerCode = updated.code;
      }
      return updated;
    });
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    >
      <div ref={modalRef} className="card w-[900px] max-w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        
        {/* Header */}
        <div className="card__header bg-[var(--color-snow)]">
          <h2 className="card__title">
            {initialData ? `Edit ${entityLabel}` : `Create New ${entityLabel}`}
          </h2>
          <button onClick={onClose} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-mist)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card__body p-6 overflow-y-auto">
          {initialData && (
            <div className="mb-6 pb-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-slate)] uppercase tracking-wider font-semibold">Selected Record</p>
                <p className="text-h3 text-[var(--color-forest)]">{formData.code} - {formData.name}</p>
              </div>
            </div>
          )}


          <form id="accountForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Basic</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <input ref={codeInputRef} required name="code" value={formData.code} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
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
                  <span className="text-[11px] text-[var(--color-slate)] mt-0.5 block">Positive for Credit, Negative for Debit</span>
                </div>
                
                {groupName === 'Sundry Debtors' && (
                  <>
                    <div className="form-group flex items-center h-full pt-6">
                      <label className="flex items-center gap-2 text-sm text-[var(--color-slate)] cursor-pointer hover:text-[var(--color-charcoal)] transition-colors">
                        <input
                          type="checkbox"
                          name="isDirectClient"
                          checked={formData.isDirectClient}
                          onChange={handleChange}
                          className="rounded text-[var(--color-emerald)] focus:ring-[var(--color-emerald)]"
                        />
                        Is Direct Client
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dealer Code *</label>
                      {formData.isDirectClient ? (
                        <input
                          disabled
                          value={formData.code}
                          placeholder="Same as Client Code"
                          className="input opacity-60 bg-[var(--color-snow)]"
                        />
                      ) : (
                        <select
                          required
                          name="dealerCode"
                          value={formData.dealerCode}
                          onChange={handleChange}
                          className="input"
                        >
                          <option value="">-- Select Direct Client --</option>
                          {directClients.map(c => (
                            <option key={c.id} value={c.code}>
                              {c.code} - {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Contact details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Address</label>
                  <textarea name="address" rows={3} value={formData.address} onChange={handleChange} className="input resize-none" />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile number</label>
                  <input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Office number</label>
                  <input name="officeNumber" value={formData.officeNumber} onChange={handleChange} className="input" />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp number</label>
                  <input
                    name="whatsappNumber"
                    value={formData.isWhatsappSameAsMobile ? formData.mobileNumber : formData.whatsappNumber}
                    onChange={handleChange}
                    disabled={formData.isWhatsappSameAsMobile}
                    className={cn("input", formData.isWhatsappSameAsMobile && 'opacity-60 bg-[var(--color-snow)]')}
                  />
                  <label className="flex items-center gap-2 text-sm text-[var(--color-slate)] mt-2 cursor-pointer hover:text-[var(--color-charcoal)] transition-colors">
                    <input type="checkbox" name="isWhatsappSameAsMobile" checked={formData.isWhatsappSameAsMobile} onChange={handleChange} className="rounded text-[var(--color-emerald)] focus:ring-[var(--color-emerald)]" />
                    WhatsApp number is same as mobile
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Email ID</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Contact person</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Contact person name</label>
                  <input name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact person mobile</label>
                  <input name="contactPersonMobile" value={formData.contactPersonMobile} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact person email</label>
                  <input name="contactPersonEmail" type="email" value={formData.contactPersonEmail} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Banking details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Bank name</label>
                  <input name="bankName" value={formData.bankName} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank branch</label>
                  <input name="bankBranch" value={formData.bankBranch} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC code</label>
                  <input name="ifscCode" value={formData.ifscCode} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">MICR code</label>
                  <input name="micrCode" value={formData.micrCode} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Account number</label>
                  <input name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input name="upiId" value={formData.upiId} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Referred by</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Reference Name</label>
                  <input name="referenceName" value={formData.referenceName} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference mobile number</label>
                  <input name="referenceMobile" value={formData.referenceMobile} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference email</label>
                  <input name="referenceEmail" type="email" value={formData.referenceEmail} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 flex justify-end gap-3 border-t border-[var(--color-border-light)]">
               <button type="button" onClick={onClose} className="btn btn--secondary">Cancel</button>
               <button type="submit" form="accountForm" className="btn btn--primary">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
