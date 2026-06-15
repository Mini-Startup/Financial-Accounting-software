'use client';

import { useState } from 'react';
import { ScriptFormModal } from './ScriptFormModal';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ScriptDataTable({
  scripts,
  exchanges,
}: {
  scripts: any[];
  exchanges: any[];
}) {
  const [editingScript, setEditingScript] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Script deleted successfully');
        window.location.reload();
      } else {
        toast.error('Failed to delete script');
      }
    } catch {
      toast.error('Failed to delete script');
    }
  };

  return (
    <>
      <div className="card">
        <div className="card__body p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Short Name</th>
                <th>Full Name</th>
                <th>ISIN</th>
                <th>Lot Size</th>
                <th>Exchange Mappings</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--color-slate)] font-medium">
                    No scripts found.
                  </td>
                </tr>
              ) : null}
              {scripts.map((script) => (
                <tr key={script.id}>
                  <td className="font-mono font-medium text-[var(--color-charcoal)]">
                    {script.shortName}
                  </td>
                  <td className="font-medium text-[var(--color-charcoal)]">
                    {script.fullName}
                  </td>
                  <td className="text-[var(--color-slate)] font-mono text-xs">
                    {script.isin || 'N/A'}
                  </td>
                  <td className="font-semibold text-[var(--color-charcoal)] font-mono">
                    {script.lotSize}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {script.scriptExchangeMappings && script.scriptExchangeMappings.length > 0 ? (
                        script.scriptExchangeMappings.map((m: any) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/20"
                          >
                            {m.exchange?.code}: {m.exchangeScriptCode}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--color-slate)]/40 italic text-xs">None</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setEditingScript(script)}
                        className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-emerald)] transition-colors rounded-md hover:bg-[var(--color-mist)]"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(script.id)}
                        className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-md hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingScript && (
        <ScriptFormModal 
          initialData={editingScript} 
          exchanges={exchanges}
          onClose={() => setEditingScript(null)} 
        />
      )}
    </>
  );
}
