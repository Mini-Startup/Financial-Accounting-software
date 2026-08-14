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
      <div className="card shadow-sm border border-slate-200">
        <div className="card__body p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Short Name</th>
                <th>Full Name</th>
                <th>Market Lot</th>
                <th>Exchange</th>
                <th>Currency</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No scripts found.
                  </td>
                </tr>
              ) : null}
              {scripts.map((script) => {
                const exCode = script.exchange?.code || script.scriptExchangeMappings?.[0]?.exchange?.code || '—';
                const currCode = script.currency ? `${script.currency.code} ${script.currency.symbol ? `(${script.currency.symbol})` : ''}` : 'USD ($)';
                return (
                  <tr key={script.id}>
                    <td className="font-mono font-bold text-slate-800">
                      {script.shortName}
                    </td>
                    <td className="font-medium text-slate-800">
                      {script.fullName}
                    </td>
                    <td className="font-semibold text-slate-700 font-mono">
                      {Number(script.lotSize).toLocaleString()}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {exCode}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        {currCode}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingScript(script)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(script.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
