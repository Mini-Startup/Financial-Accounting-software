'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScriptDataTable } from './ScriptDataTable';
import { ScriptFormModal } from './ScriptFormModal';
import { useTopBar } from '@/context/TopBarContext';
import { Plus } from 'lucide-react';
import { UniversalTooltip } from '../ui/UniversalTooltip';

export function ScriptPageManager({
  scripts,
  exchanges,
}: {
  scripts: any[];
  exchanges: any[];
}) {
  const searchParams = useSearchParams();
  const isAddParam = searchParams?.get('action') === 'add';
  const [isAdding, setIsAdding] = useState(isAddParam);
  const { setTopBar, resetTopBar } = useTopBar();

  const handleCloseAdd = () => {
    setIsAdding(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('action')) {
        url.searchParams.delete('action');
        const cleanUrl = url.pathname + (url.search ? url.search : '');
        window.history.pushState({}, '', cleanUrl);
      }
    }
  };

  useEffect(() => {
    if (isAddParam) {
      setIsAdding(true);
    }
  }, [isAddParam]);

  // Push unified page title & actions to TopBar
  useEffect(() => {
    setTopBar({
      title: 'Scripts',
      actions: (
        <UniversalTooltip content="Add a new script or security mapping">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Script</span>
          </button>
        </UniversalTooltip>
      ),
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar]);

  return (
    <div className="w-full space-y-4">
      <ScriptDataTable scripts={scripts} exchanges={exchanges} />

      {isAdding && (
        <ScriptFormModal 
          exchanges={exchanges}
          scripts={scripts}
          onClose={handleCloseAdd} 
        />
      )}
    </div>
  );
}
