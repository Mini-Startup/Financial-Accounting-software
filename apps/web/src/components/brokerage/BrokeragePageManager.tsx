'use client';
import { useState, useMemo } from 'react';
import { BrokerageDataTable } from './BrokerageDataTable';
import { BrokerageFormModal } from './BrokerageFormModal';
import { UniversalDropdown } from '@/components/ui/UniversalDropdown';
import { Plus } from 'lucide-react';

export function BrokeragePageManager({ 
  initialBrokerages, 
  accounts, 
  scripts 
}: { 
  initialBrokerages: any[], 
  exchanges?: any[], 
  accounts: any[], 
  scripts: any[] 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [filterAppliesTo, setFilterAppliesTo] = useState<'ALL' | 'CLIENT' | 'BROKER'>('ALL');

  const appliesToOptions = useMemo(() => [
    { value: 'ALL', label: 'All (Client & Broker)' },
    { value: 'CLIENT', label: 'Clients Only' },
    { value: 'BROKER', label: 'Brokers Only' }
  ], []);

  const filteredBrokerages = initialBrokerages.filter(b => {
    if (filterAppliesTo !== 'ALL' && b.appliesTo !== filterAppliesTo) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brokerage Rules</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure quantity-based brokerage rules per client or broker for each script.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-56">
            <UniversalDropdown
              options={appliesToOptions}
              value={filterAppliesTo}
              onChange={(val) => setFilterAppliesTo(val as any)}
              placeholder="Filter Applies To"
            />
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      <BrokerageDataTable 
        brokerages={filteredBrokerages} 
        accounts={accounts}
        scripts={scripts}
      />

      {isAdding && (
        <BrokerageFormModal 
          accounts={accounts}
          scripts={scripts}
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
