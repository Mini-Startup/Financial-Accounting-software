'use client';
import { useState } from 'react';
import { ScriptDataTable } from './ScriptDataTable';
import { ScriptFormModal } from './ScriptFormModal';

export function ScriptPageManager({ accounts }: { accounts: any[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Scripts</h1>
          <p className="text-gray-500 mt-1">Manage global script definitions, exchange metrics, and margins.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
             placeholder="Search scripts..." 
             className="px-4 py-2 border border-gray-200 rounded-xl text-sm w-[250px] shadow-sm bg-white" 
          />
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 font-semibold transition"
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
