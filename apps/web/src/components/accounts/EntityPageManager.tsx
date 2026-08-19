'use client';
import { useState } from 'react';
import { DataTable } from './DataTable';
import { FormModal } from './FormModal';
import { SearchBar } from './SearchBar';

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

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">{title}</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage all {title.toLowerCase()} configured across the accounting framework.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <SearchBar />
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary"
          >
            + Add {entityLabel}
          </button>
        </div>
      </div>

      <DataTable accounts={accounts} groupName={groupName} entityLabel={entityLabel} />

      {isAdding && (
        <FormModal 
          entityLabel={entityLabel}
          groupName={groupName}
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
