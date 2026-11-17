'use client';
import { useState } from 'react';
import { DataTable } from './DataTable';
import { FormModal } from './FormModal';
import { SearchBar } from './SearchBar';
import { usePermissions } from '../../context/AuthPermissionsContext';

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
  const [isAdding, setIsAdding] = useState(false);
  const { hasPermission } = usePermissions();

  const feature = entityLabel.toLowerCase().includes('broker')
    ? 'BROKERS'
    : entityLabel.toLowerCase().includes('client')
    ? 'CLIENTS'
    : 'ACCOUNT_MASTER';

  const canCreate = hasPermission(feature, 'CREATE') || hasPermission('ACCOUNT_MASTER', 'CREATE');
  const canEdit = hasPermission(feature, 'EDIT') || hasPermission('ACCOUNT_MASTER', 'EDIT');
  const canDelete = hasPermission(feature, 'DELETE') || hasPermission('ACCOUNT_MASTER', 'DELETE');

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">{title}</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage all {title.toLowerCase()} configured across the accounting framework.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <SearchBar />
          {canCreate && (
            <button 
              onClick={() => setIsAdding(true)}
              className="btn btn--primary"
            >
              + Add {entityLabel}
            </button>
          )}
        </div>
      </div>

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
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
