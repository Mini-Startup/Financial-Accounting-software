'use client';
import { useState, useMemo, useEffect } from 'react';
import { BrokerageDataTable } from './BrokerageDataTable';
import { BrokerageFormModal } from './BrokerageFormModal';
import { UniversalDropdown } from '@/components/ui/UniversalDropdown';
import { useTopBar } from '@/context/TopBarContext';
import { Plus } from 'lucide-react';
import { UniversalTooltip } from '../ui/UniversalTooltip';

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
  const { setTopBar, resetTopBar } = useTopBar();

  // Push unified page title & actions to TopBar
  useEffect(() => {
    setTopBar({
      title: 'Brokerage Rules',
      actions: (
        <UniversalTooltip content="Add a new custom brokerage rule">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Rule</span>
          </button>
        </UniversalTooltip>
      ),
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar]);

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
    <div className="w-full space-y-4">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
        <div className="w-56">
          <UniversalDropdown
            options={appliesToOptions}
            value={filterAppliesTo}
            onChange={(val) => setFilterAppliesTo(val as any)}
            placeholder="Filter Applies To"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Total: <span className="font-bold text-slate-800">{filteredBrokerages.length}</span> rules
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
