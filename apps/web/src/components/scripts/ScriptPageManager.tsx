'use client';

import { useState } from 'react';
import { ScriptDataTable } from './ScriptDataTable';
import { ScriptFormModal } from './ScriptFormModal';

export function ScriptPageManager({
  scripts,
  exchanges,
}: {
  scripts: any[];
  exchanges: any[];
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Scripts</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage scripts and code mappings across different exchanges.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="btn btn--primary"
          >
            + Add Script
          </button>
        </div>
      </div>

      <ScriptDataTable scripts={scripts} exchanges={exchanges} />

      {isAdding && (
        <ScriptFormModal 
          exchanges={exchanges}
          scripts={scripts}
          onClose={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
