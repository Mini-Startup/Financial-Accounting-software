'use client';

import { useState, useEffect } from 'react';
import { ExchangeDataTable } from './ExchangeDataTable';
import { ExchangeFormModal } from './ExchangeFormModal';
import { useTopBar } from '@/context/TopBarContext';
import { Plus } from 'lucide-react';
import { UniversalTooltip } from '../ui/UniversalTooltip';

export function ExchangePageManager({ initialExchanges }: { initialExchanges: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const { setTopBar, resetTopBar } = useTopBar();

  // Push unified page title & actions to TopBar
  useEffect(() => {
    setTopBar({
      title: 'Exchanges',
      actions: (
        <UniversalTooltip content="Add a new market exchange">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Exchange</span>
          </button>
        </UniversalTooltip>
      ),
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar]);

  return (
    <div className="w-full space-y-4">
      <ExchangeDataTable exchanges={initialExchanges} />

      {isAdding && (
        <ExchangeFormModal 
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
