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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1">Manage all {title.toLowerCase()} configured across the accounting framework.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <SearchBar />
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 font-semibold transition"
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
