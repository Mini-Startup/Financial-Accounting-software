'use client';
import { useState } from 'react';
import { CurrencyDataTable } from './CurrencyDataTable';
import { CurrencyFormModal } from './CurrencyFormModal';
import { SearchBar } from '../accounts/SearchBar';

export function CurrencyPageManager({ initialCurrencies }: { initialCurrencies: any[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Currencies</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage all currencies and their codes for multi-currency support.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <SearchBar />
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary"
          >
            + Add Currency
          </button>
        </div>
      </div>

      <CurrencyDataTable currencies={initialCurrencies} />

      {isAdding && (
        <CurrencyFormModal 
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
