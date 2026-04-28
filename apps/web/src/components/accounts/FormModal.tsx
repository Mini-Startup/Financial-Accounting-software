'use client';
import { useState } from 'react';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div ref={modalRef} className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl w-[900px] max-w-[95vw] max-h-[92vh] rounded-2xl flex flex-col font-sans text-[var(--color-text-main)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-3">
              {initialData ? `Edit ${entityLabel}` : `Create New ${entityLabel}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {initialData && (
            <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-caption">Selected Record</p>
                <p className="text-title text-[var(--color-primary)]">{formData.code} - {formData.name}</p>
              </div>
            </div>
          )}


          <form id="accountForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Basic</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Code *</label>
                  <input required name="code" value={formData.code} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Name *</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Contact details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <textarea name="address" rows={3} value={formData.address} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Mobile number</label>
                  <input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Office number</label>
                  <input name="officeNumber" value={formData.officeNumber} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">WhatsApp number</label>
                  <input
                    name="whatsappNumber"
                    value={formData.isWhatsappSameAsMobile ? formData.mobileNumber : formData.whatsappNumber}
                    onChange={handleChange}
                    disabled={formData.isWhatsappSameAsMobile}
                    className={`w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all ${formData.isWhatsappSameAsMobile ? 'bg-gray-50 text-gray-500' : ''}`}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                    <input type="checkbox" name="isWhatsappSameAsMobile" checked={formData.isWhatsappSameAsMobile} onChange={handleChange} />
                    WhatsApp number is same as mobile
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email ID</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Contact person</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-700">Contact person name</label>
                  <input name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Contact person mobile</label>
                  <input name="contactPersonMobile" value={formData.contactPersonMobile} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Contact person email</label>
                  <input name="contactPersonEmail" type="email" value={formData.contactPersonEmail} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Credit</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Default credit (optional)</label>
                  <input name="defaultCredit" type="number" step="any" value={formData.defaultCredit} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Interest</label>
                  <input name="interest" type="number" step="any" value={formData.interest} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Banking details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Bank name</label>
                  <input name="bankName" value={formData.bankName} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Bank branch</label>
                  <input name="bankBranch" value={formData.bankBranch} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">IFSC code</label>
                  <input name="ifscCode" value={formData.ifscCode} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Account number</label>
                  <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-700">UPI ID</label>
                  <input name="upiId" value={formData.upiId} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Referred by</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Reference mobile number</label>
                  <input name="referenceMobile" value={formData.referenceMobile} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Reference email</label>
                  <input name="referenceEmail" type="email" value={formData.referenceEmail} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all" />
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-gray-100">
               <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
               <button type="submit" form="accountForm" className="btn-primary">Save {groupName}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
