'use client';
import { useState } from 'react';
import { ExchangeDataTable } from './ExchangeDataTable';
import { ExchangeFormModal } from './ExchangeFormModal';
import { SearchBar } from '../accounts/SearchBar';

export function ExchangePageManager({ initialExchanges }: { initialExchanges: any[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Exchanges</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage all exchanges configured across the accounting framework.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <SearchBar />
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary"
          >
            + Add Exchange
          </button>
        </div>
      </div>

      <ExchangeDataTable exchanges={initialExchanges} />

      {isAdding && (
        <ExchangeFormModal 
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
