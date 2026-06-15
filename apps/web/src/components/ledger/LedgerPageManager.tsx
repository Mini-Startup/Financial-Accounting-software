'use client';

import { useState } from 'react';
import { LedgerFormModal } from './LedgerFormModal';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function LedgerPageManager({
  initialAccounts,
  groups,
}: {
  initialAccounts: any[];
  groups: any[];
}) {
  const [accounts, setAccounts] = useState<any[]>(initialAccounts);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ledger account?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccounts(prev => prev.filter(acc => acc.id !== id));
        toast.success('Ledger account deleted successfully');
      } else {
        toast.error('Failed to delete ledger account');
      }
    } catch {
      toast.error('Failed to delete ledger account');
    }
  };

  const handleSave = () => {
    window.location.reload(); // Refresh to sync data
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Ledger</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage standard and banking ledger accounts cross-referenced with your journal.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn btn--primary">+ Add Ledger</button>
      </div>

      <div className="card">
        <div className="card__body p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Group</th>
                <th>Contact</th>
                <th>UPI / Bank Info</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--color-slate)] font-medium">
                    No ledger entries found. Click "+ Add Ledger" to create one.
                  </td>
                </tr>
              ) : null}
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td className="font-mono font-medium text-[var(--color-charcoal)]">{acc.code}</td>
                  <td className="font-medium text-[var(--color-charcoal)]">{acc.name}</td>
                  <td className="text-[var(--color-slate)]">{acc.group?.name || 'N/A'}</td>
                  <td className="text-[var(--color-slate)] text-xs">
                    {acc.mobileNumber && <div>Mob: {acc.mobileNumber}</div>}
                    {acc.email && <div className="truncate max-w-[150px]">{acc.email}</div>}
                  </td>
                  <td className="text-[var(--color-slate)] text-xs">
                    {acc.group?.name === 'Bank Accounts' ? (
                      <div>
                        {acc.bankName && <div>{acc.bankName} - {acc.bankAccountNumber}</div>}
                        {acc.upiId && <div>UPI: {acc.upiId}</div>}
                      </div>
                    ) : (
                      <span className="text-[var(--color-slate)]/40">-</span>
                    )}
                  </td>
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

      {isAdding && (
        <LedgerFormModal
          groups={groups}
          onClose={() => setIsAdding(false)}
          onSave={handleSave}
        />
      )}

      {editingAccount && (
        <LedgerFormModal
          initialData={editingAccount}
          groups={groups}
          onClose={() => setEditingAccount(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
