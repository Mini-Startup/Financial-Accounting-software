'use client';
import { useState } from 'react';
import { CurrencyFormModal } from './CurrencyFormModal';

export function CurrencyDataTable({ currencies }: { currencies: any[] }) {
  const [editingCurrency, setEditingCurrency] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this currency?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/currencies/${id}`, { method: 'DELETE' });
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
              <th>Code</th>
              <th>Name</th>
              <th>Symbol</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currencies.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--color-slate)] font-medium">No currencies recorded.</td>
              </tr>
            ) : null}
            {currencies.map((cur) => (
              <tr key={cur.id}>
                <td className="font-medium text-[var(--color-charcoal)]">{cur.code}</td>
                <td className="text-[var(--color-slate)]">{cur.name || '-'}</td>
                <td className="text-[var(--color-charcoal)] text-lg">{cur.symbol || '-'}</td>
                <td>
                  {cur.isActive ? (
                    <span className="badge badge--dot badge--success">Active</span>
                  ) : (
                    <span className="badge badge--dot badge--error">Inactive</span>
                  )}
                </td>
                <td className="text-right">
                  <button 
                    onClick={() => setEditingCurrency(cur)}
                    className="text-[var(--color-forest)] hover:text-[var(--color-emerald)] mr-4 font-semibold transition text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(cur.id)}
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

    {editingCurrency && (
      <CurrencyFormModal 
        initialData={editingCurrency} 
        onClose={() => setEditingCurrency(null)} 
      />
    )}
    </>
  );
}
