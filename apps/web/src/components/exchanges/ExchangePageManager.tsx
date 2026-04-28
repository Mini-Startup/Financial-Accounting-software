'use client';
import { useState } from 'react';
import { ExchangeDataTable } from './ExchangeDataTable';
import { ExchangeFormModal } from './ExchangeFormModal';
import { SearchBar } from '../accounts/SearchBar'; // Re-use search bar if applicable, or make it generic

export function ExchangePageManager({ initialExchanges }: { initialExchanges: any[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Exchanges</h1>
          <p className="text-gray-500 mt-1">Manage all exchanges configured across the accounting framework.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <SearchBar />
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-primary"
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
