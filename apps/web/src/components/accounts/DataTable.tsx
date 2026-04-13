'use client';
import { useState } from 'react';
import { FormModal } from './FormModal';

export function DataTable({ accounts, groupName }: { accounts: any[], groupName: string }) {
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
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-gray-100/50 text-gray-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/60">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code / ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-gray-100">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">No active {groupName} recorded.</td>
              </tr>
            ) : null}
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{acc.code || acc.id.substring(0, 8)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{acc.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{acc.mobile || acc.email || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{acc.closingBalance ? `$${acc.closingBalance}` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => setEditingAccount(acc)}
                    className="text-blue-600 hover:text-blue-900 mr-4 font-semibold transition"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(acc.id)}
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

    {editingAccount && (
      <FormModal 
        initialData={editingAccount} 
        groupName={groupName}
        onClose={() => setEditingAccount(null)} 
      />
    )}
    </>
  );
}
