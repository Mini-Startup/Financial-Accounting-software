'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable } from './DataTable';
import { FormModal } from './FormModal';
import { usePermissions } from '../../context/AuthPermissionsContext';
import { useTopBar } from '@/context/TopBarContext';
import { Plus } from 'lucide-react';

export function EntityPageManager({
  title,
  entityLabel,
  groupName,
  accounts,
}: {
  title: string;
  entityLabel: string;
  groupName: string;
  accounts: any[];
}) {
  const searchParams = useSearchParams();
  const isAddParam = searchParams?.get('action') === 'add';
  const [isAdding, setIsAdding] = useState(isAddParam);
  const { hasPermission } = usePermissions();
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

  useEffect(() => {
    const handleOpenAdd = () => setIsAdding(true);
    const eventName = entityLabel.toLowerCase().includes('broker')
      ? 'bizzmate-open-add-broker'
      : 'bizzmate-open-add-client';
    window.addEventListener(eventName, handleOpenAdd);
    return () => window.removeEventListener(eventName, handleOpenAdd);
  }, [entityLabel]);

  const feature = entityLabel.toLowerCase().includes('broker')
    ? 'BROKERS'
    : entityLabel.toLowerCase().includes('client')
    ? 'CLIENTS'
    : 'ACCOUNT_MASTER';

  const canCreate = hasPermission(feature, 'CREATE') || hasPermission('ACCOUNT_MASTER', 'CREATE');
  const canEdit = hasPermission(feature, 'EDIT') || hasPermission('ACCOUNT_MASTER', 'EDIT');
  const canDelete = hasPermission(feature, 'DELETE') || hasPermission('ACCOUNT_MASTER', 'DELETE');

  // Push unified page title & actions to TopBar
  useEffect(() => {
    setTopBar({
      title,
      actions: canCreate ? (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add {entityLabel}</span>
        </button>
      ) : null,
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar, title, entityLabel, canCreate]);

  return (
    <div className="w-full">
      <DataTable
        accounts={accounts}
        groupName={groupName}
        entityLabel={entityLabel}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {isAdding && (
        <FormModal 
          entityLabel={entityLabel}
          groupName={groupName}
          accounts={accounts}
          onClose={handleCloseAdd} 
        />
      )}
    </div>
  );
}
