'use client';
import { useState } from 'react';
import { BrokerageDataTable } from './BrokerageDataTable';
import { BrokerageFormModal } from './BrokerageFormModal';

export function BrokeragePageManager({ 
  initialBrokerages, 
  exchanges, 
  accounts, 
  scripts 
}: { 
  initialBrokerages: any[], 
  exchanges: any[], 
  accounts: any[], 
  scripts: any[] 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [filterAppliesTo, setFilterAppliesTo] = useState<'ALL' | 'CLIENT' | 'BROKER'>('ALL');
  const [filterExchangeId, setFilterExchangeId] = useState<string>('ALL');

  const filteredBrokerages = initialBrokerages.filter(b => {
    if (filterAppliesTo !== 'ALL' && b.appliesTo !== filterAppliesTo) return false;
    if (filterExchangeId !== 'ALL' && b.exchangeId !== filterExchangeId) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Brokerage Rules</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Configure trading and delivery brokerage rules for clients and brokers.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="input w-auto text-sm"
            value={filterExchangeId}
            onChange={e => setFilterExchangeId(e.target.value)}
          >
            <option value="ALL">All Exchanges</option>
            {exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
          </select>

          <select 
            className="input w-auto text-sm"
            value={filterAppliesTo}
            onChange={e => setFilterAppliesTo(e.target.value as any)}
          >
            <option value="ALL">All Types</option>
            <option value="CLIENT">Clients Only</option>
            <option value="BROKER">Brokers Only</option>
          </select>

          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary ml-2"
          >
            + Add Rule
          </button>
        </div>
      </div>

      <BrokerageDataTable brokerages={filteredBrokerages} />

      {isAdding && (
        <BrokerageFormModal 
          exchanges={exchanges}
          accounts={accounts}
          scripts={scripts}
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
