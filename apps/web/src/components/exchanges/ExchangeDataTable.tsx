'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExchangeFormModal } from './ExchangeFormModal';

export function ExchangeDataTable({ exchanges }: { exchanges: any[] }) {
  const router = useRouter();
  const [editingExchange, setEditingExchange] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this exchange?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exchanges/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Exchange deactivated successfully');
        router.refresh();
      } else {
        throw new Error('Failed to deactivate exchange');
      }
    } catch(e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to delete right now.');
    }
  };

  return (
    <>
    <div className="card">
      <div className="card__body p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exchanges.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--color-slate)] font-medium">No exchanges recorded.</td>
              </tr>
            ) : null}
            {exchanges.map((exc) => (
              <tr key={exc.id}>
                <td className="font-medium text-[var(--color-charcoal)]">{exc.code}</td>
                <td className="text-[var(--color-slate)]">{exc.name || '-'}</td>
                <td>
                  {exc.isActive ? (
                    <span className="badge badge--dot badge--success">Active</span>
                  ) : (
                    <span className="badge badge--dot badge--error">Inactive</span>
                  )}
                </td>
                <td className="text-right">
                  <button 
                    onClick={() => setEditingExchange(exc)}
                    className="text-[var(--color-forest)] hover:text-[var(--color-emerald)] mr-4 font-semibold transition text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(exc.id)}
                    className="text-[var(--color-negative)] hover:opacity-80 font-semibold transition text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {editingExchange && (
      <ExchangeFormModal 
        initialData={editingExchange} 
        onClose={() => setEditingExchange(null)} 
      />
    )}
    </>
  );
}
