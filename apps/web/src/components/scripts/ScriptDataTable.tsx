'use client';
import { useState } from 'react';
import { ScriptFormModal } from './ScriptFormModal';

export function ScriptDataTable({ accounts }: { accounts: any[] }) {
  const [editingScript, setEditingScript] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    try {
      await fetch(`http://localhost:4000/scripts/${id}`, { method: 'DELETE' });
      window.location.reload();
    } catch(e) {
      console.error(e);
      alert('Failed to delete right now.');
    }
  };

  return (
    <>
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden text-gray-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/60">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Short / ISIN</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Primary Exchange Code</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lot Size</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-gray-100">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">No scripts recorded.</td>
              </tr>
            ) : null}
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {acc.fldShortScript} {acc.fldISIN ? `(${acc.fldISIN})` : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{acc.fldScriptName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                  {acc.fldScriptNSE || acc.fldScriptBSE || acc.fldScriptMCX || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{acc.fldLotSize || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => setEditingScript(acc)} className="text-blue-600 hover:text-blue-900 mr-4 font-semibold transition">Edit</button>
                  <button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700 font-semibold transition">Delete</button>
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
        onClose={() => setEditingScript(null)} 
      />
    )}
    </>
  );
}
