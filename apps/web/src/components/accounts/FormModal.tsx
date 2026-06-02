'use client';
import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function FormModal({
  initialData,
  entityLabel,
  groupName,
  onClose,
}: {
  initialData?: any;
  entityLabel: string;
  groupName: string;
  onClose: () => void;
}) {
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

    defaultCredit: initialData?.defaultCredit ?? '',
    interest: initialData?.interest ?? '',

    bankName: initialData?.bankName || '',
    bankBranch: initialData?.bankBranch || '',
    ifscCode: initialData?.ifscCode || '',
    accountNumber: initialData?.accountNumber || '',
    upiId: initialData?.upiId || '',

    referenceMobile: initialData?.referenceMobile || '',
    referenceEmail: initialData?.referenceEmail || '',
    ...initialData // Keep ID if passing through
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialData?.id 
        ? `http://localhost:4000/accounts/${initialData.id}` 
        : `http://localhost:4000/accounts`;
      
      const payloadForm = { ...formData };
      if (payloadForm.isWhatsappSameAsMobile) {
        payloadForm.whatsappNumber = payloadForm.mobileNumber;
      }
      delete (payloadForm as any).isWhatsappSameAsMobile;

      const payload = {
        ...payloadForm,
        groupName: initialData?.fldGroupNo ? undefined : groupName, 
      };
      
      await fetch(url, {
        method: initialData?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      window.location.reload();
    } catch(err) {
      console.error(err);
      alert('Save failed.');
    }
  }

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
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
                  <input required name="code" value={formData.code} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="input" />
                </div>
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
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Credit</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Default credit (optional)</label>
                  <input name="defaultCredit" type="number" step="any" value={formData.defaultCredit} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Interest</label>
                  <input name="interest" type="number" step="any" value={formData.interest} onChange={handleChange} className="input" />
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
                  <label className="form-label">Account number</label>
                  <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="input" />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">UPI ID</label>
                  <input name="upiId" value={formData.upiId} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--color-slate)] uppercase">Referred by</h3>
              <div className="grid grid-cols-2 gap-4">
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
               <button type="submit" form="accountForm" className="btn btn--primary">Save {groupName}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
