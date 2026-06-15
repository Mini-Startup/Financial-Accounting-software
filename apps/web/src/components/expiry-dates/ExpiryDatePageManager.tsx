'use client';
import { useState } from 'react';
import { ExpiryDateDataTable } from './ExpiryDateDataTable';
import { ExpiryDateFormModal } from './ExpiryDateFormModal';

export function ExpiryDatePageManager({ initialExpiryDates }: { initialExpiryDates: any[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Expiry Dates</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage active F&O expiry dates used for accounting and trade records.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary"
          >
            + Add Expiry Date
          </button>
        </div>
      </div>

      <ExpiryDateDataTable expiryDates={initialExpiryDates} />

      {isAdding && (
        <ExpiryDateFormModal 
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
