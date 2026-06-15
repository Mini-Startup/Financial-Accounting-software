'use client';
import { useState } from 'react';
import { ExpiryDateFormModal } from './ExpiryDateFormModal';
import { Pencil, Trash2 } from 'lucide-react';

export function ExpiryDateDataTable({ expiryDates }: { expiryDates: any[] }) {
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expiry date?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/expiry-dates/${id}`, {
        method: 'DELETE',
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Delete failed.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="card">
      <div className="card__body p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Expiry Date</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expiryDates.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-[var(--color-slate)] font-medium">
                  No expiry dates configured. Click "+ Add Expiry Date" to create one.
                </td>
              </tr>
            ) : (
              expiryDates.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono font-medium text-[var(--color-charcoal)]">
                    {formatDate(item.date)}
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.isActive 
                        ? 'bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] border border-[var(--color-emerald)]/20' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-emerald)] transition-colors rounded-md hover:bg-[var(--color-mist)]"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <ExpiryDateFormModal 
          initialData={editingItem} 
          onClose={() => setEditingItem(null)} 
        />
      )}
    </div>
  );
}
