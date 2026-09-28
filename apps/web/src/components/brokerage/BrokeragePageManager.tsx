'use client';
import { useState, useMemo } from 'react';
import { BrokerageDataTable } from './BrokerageDataTable';
import { BrokerageFormModal } from './BrokerageFormModal';
import { UniversalDropdown } from '@/components/ui/UniversalDropdown';

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

  const exchangeOptions = useMemo(() => [
    { value: 'ALL', label: 'All Exchanges' },
    ...exchanges.map(ex => ({ value: ex.id, label: ex.code }))
  ], [exchanges]);

  const appliesToOptions = useMemo(() => [
    { value: 'ALL', label: 'All Types' },
    { value: 'CLIENT', label: 'Clients Only' },
    { value: 'BROKER', label: 'Brokers Only' }
  ], []);

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
          <div className="w-44">
            <UniversalDropdown
              options={exchangeOptions}
              value={filterExchangeId}
              onChange={(val) => setFilterExchangeId(val)}
              placeholder="All Exchanges"
            />
          </div>

          <div className="w-40">
            <UniversalDropdown
              options={appliesToOptions}
              value={filterAppliesTo}
              onChange={(val) => setFilterAppliesTo(val as any)}
              placeholder="All Types"
            />
          </div>

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
