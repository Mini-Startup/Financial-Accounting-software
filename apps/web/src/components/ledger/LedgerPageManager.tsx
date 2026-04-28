'use client';

import { useState } from 'react';
import { LedgerFormModal } from './LedgerFormModal';

export function LedgerPageManager() {
  const [rows, setRows] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);

  const upsertRow = (row: any) => {
    setRows(prev => {
      const index = prev.findIndex(p => p.id === row.id);
      if (index === -1) return [row, ...prev];
      const copy = [...prev];
      copy[index] = row;
      return copy;
    });
  };

  const deleteRow = (id: string) => {
    setRows(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Ledger</h1>
          <p className="text-gray-500 mt-1">Frontend-only ledger form as per your required layout. No API or DB save.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn-primary">+ Add Ledger</button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/60">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Opening</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Closing</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account Group</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-medium">
                    No ledger entries yet.
                  </td>
                </tr>
              ) : null}
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.accountCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{row.accountName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.openingBalance}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.closingBalance}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.accountGroup}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button className="text-blue-600 hover:text-blue-800 mr-4" onClick={() => setEditingRow(row)}>Edit</button>
                    <button className="text-red-600 hover:text-red-800" onClick={() => deleteRow(row.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <LedgerFormModal
          onClose={() => setIsAdding(false)}
          onSave={upsertRow}
        />
      )}

      {editingRow && (
        <LedgerFormModal
          initialData={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={upsertRow}
        />
      )}
    </div>
  );
}

