'use client';
import { useState } from 'react';
import { FormModal } from './FormModal';
import { cn } from '@/utils/cn';
import { Edit2, Trash2 } from 'lucide-react';

export function DataTable({ accounts, groupName, entityLabel }: { accounts: any[], groupName: string, entityLabel: string }) {
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this specific record?')) return;
    try {
      await fetch(`http://localhost:4000/accounts/${id}`, { method: 'DELETE' });
      window.location.reload(); // Hard reload syncs layout with DB easily
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
              <th>Code / ID</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Balance</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--color-slate)] font-medium">No {entityLabel.toLowerCase()} found.</td>
              </tr>
            ) : null}
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td className="font-mono font-medium text-[var(--color-charcoal)]">{acc.code || acc.fldClient || acc.id.substring(0, 8)}</td>
                <td className="font-medium text-[var(--color-charcoal)]">{acc.name || acc.fldName}</td>
                <td className="text-[var(--color-slate)]">{acc.mobileNumber || acc.whatsappNumber || acc.email || acc.fldMobile || acc.fldEmail || 'N/A'}</td>
                <td className="font-mono font-semibold text-[var(--color-charcoal)]">{acc.closing || acc.opening || acc.fldClosing || acc.fldOpening ? `${acc.closing ?? acc.opening ?? acc.fldClosing ?? acc.fldOpening}` : '-'}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setEditingAccount(acc)}
                      className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-emerald)] transition-colors rounded-md hover:bg-[var(--color-mist)]"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(acc.id)}
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

    {editingAccount && (
      <FormModal 
        initialData={editingAccount} 
        entityLabel={entityLabel}
        groupName={groupName}
        onClose={() => setEditingAccount(null)} 
      />
    )}
    </>
  );
}
