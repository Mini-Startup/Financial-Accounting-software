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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Ledger</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Frontend-only ledger form as per your required layout. No API or DB save.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn btn--primary">+ Add Ledger</button>
      </div>

      <div className="card">
        <div className="card__body p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Opening</th>
                <th>Closing</th>
                <th>Account Group</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--color-slate)] font-medium">
                    No ledger entries yet.
                  </td>
                </tr>
              ) : null}
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="text-[var(--color-slate)]">{row.accountCode}</td>
                  <td className="font-medium text-[var(--color-charcoal)]">{row.accountName}</td>
                  <td className="font-mono text-[var(--color-slate)]">{row.openingBalance}</td>
                  <td className="font-mono text-[var(--color-slate)]">{row.closingBalance}</td>
                  <td className="text-[var(--color-slate)]">{row.accountGroup}</td>
                  <td className="text-right">
                    <button className="text-[var(--color-forest)] hover:text-[var(--color-emerald)] mr-4 font-semibold transition text-sm" onClick={() => setEditingRow(row)}>Edit</button>
                    <button className="text-[var(--color-negative)] hover:opacity-80 font-semibold transition text-sm" onClick={() => deleteRow(row.id)}>Delete</button>
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
