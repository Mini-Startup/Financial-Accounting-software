'use client';
import { useState } from 'react';
import { ScriptDataTable } from './ScriptDataTable';
import { ScriptFormModal } from './ScriptFormModal';

export function ScriptPageManager({ accounts }: { accounts: any[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Scripts</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage global script definitions, exchange metrics, and margins.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
             placeholder="Search scripts..." 
             className="input w-[250px]" 
          />
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary"
          >
            + Add New
          </button>
        </div>
      </div>

      <ScriptDataTable accounts={accounts} />

      {isAdding && (
        <ScriptFormModal onClose={() => setIsAdding(false)} />
      )}
    </div>
  );
}
