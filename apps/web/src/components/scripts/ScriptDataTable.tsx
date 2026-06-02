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
    <div className="card">
      <div className="card__body p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Short / ISIN</th>
              <th>Full Name</th>
              <th>Primary Exchange Code</th>
              <th>Lot Size</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--color-slate)] font-medium">No scripts recorded.</td>
              </tr>
            ) : null}
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td className="font-mono text-[var(--color-slate)]">
                  {acc.fldShortScript} {acc.fldISIN ? `(${acc.fldISIN})` : ''}
                </td>
                <td className="font-medium text-[var(--color-charcoal)]">{acc.fldScriptName}</td>
                <td className="font-mono text-[var(--color-slate)]">
                  {acc.fldScriptNSE || acc.fldScriptBSE || acc.fldScriptMCX || '-'}
                </td>
                <td className="font-semibold text-[var(--color-charcoal)]">{acc.fldLotSize || '-'}</td>
                <td className="text-right">
                  <button onClick={() => setEditingScript(acc)} className="text-[var(--color-forest)] hover:text-[var(--color-emerald)] mr-4 font-semibold transition text-sm">Edit</button>
                  <button onClick={() => handleDelete(acc.id)} className="text-[var(--color-negative)] hover:opacity-80 font-semibold transition text-sm">Delete</button>
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
