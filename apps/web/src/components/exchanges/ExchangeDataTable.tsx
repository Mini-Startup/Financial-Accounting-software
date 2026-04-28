'use client';
import { useState } from 'react';
import { ExchangeFormModal } from './ExchangeFormModal';

export function ExchangeDataTable({ exchanges }: { exchanges: any[] }) {
  const [editingExchange, setEditingExchange] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this exchange?')) return;
    try {
      await fetch(`http://localhost:4000/exchanges/${id}`, { method: 'DELETE' });
      window.location.reload();
    } catch(e) {
      console.error(e);
      alert('Failed to delete right now.');
    }
  };

  return (
    <>
    <div className="card overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/60">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-gray-100">
            {exchanges.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-medium">No exchanges recorded.</td>
              </tr>
            ) : null}
            {exchanges.map((exc) => (
              <tr key={exc.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exc.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exc.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {exc.isActive ? (
                    <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => setEditingExchange(exc)}
                    className="text-blue-600 hover:text-blue-900 mr-4 font-semibold transition"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(exc.id)}
                    className="text-red-500 hover:text-red-700 font-semibold transition"
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
