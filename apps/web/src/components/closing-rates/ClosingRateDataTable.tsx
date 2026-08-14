'use client';
import { useState } from 'react';
import { ClosingRateFormModal } from './ClosingRateFormModal';
import { Pencil, Trash2 } from 'lucide-react';

export function ClosingRateDataTable({ 
  closingRates, 
  exchanges, 
  scripts 
}: { 
  closingRates: any[];
  exchanges: any[];
  scripts: any[];
}) {
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this closing rate?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates/${id}`, {
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

  const getCurrencySymbol = (item: any) => {
    if (item.script?.currency?.symbol) return item.script.currency.symbol;
    if (item.script?.currency?.code) {
      if (item.script.currency.code === 'INR') return '₹';
      if (item.script.currency.code === 'USD') return '$';
      if (item.script.currency.code === 'EUR') return '€';
      if (item.script.currency.code === 'GBP') return '£';
      if (item.script.currency.code === 'AED') return 'AED ';
    }
    if (item.currencyCode) {
      if (item.currencyCode === 'INR') return '₹';
      if (item.currencyCode === 'USD') return '$';
      if (item.currencyCode === 'EUR') return '€';
      if (item.currencyCode === 'GBP') return '£';
      if (item.currencyCode === 'AED') return 'AED ';
      return `${item.currencyCode} `;
    }
    const matchingScript = scripts.find(s => s.id === item.scriptId);
    if (matchingScript?.currency?.symbol) return matchingScript.currency.symbol;
    if (matchingScript?.currency?.code === 'INR') return '₹';
    return '$';
  };

  return (
    <div className="card">
      <div className="card__body p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Exchange</th>
              <th>Security Name</th>
              <th>Script</th>
              <th>Closing Rate</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {closingRates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[var(--color-slate)] font-medium">
                  No closing rates recorded. Click "+ Add Closing Rate" to create one.
                </td>
              </tr>
            ) : (
              closingRates.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono font-medium text-[var(--color-charcoal)]">
                    {formatDate(item.rateDate)}
                  </td>
                  <td className="font-medium text-[var(--color-charcoal)]">
                    {item.exchange?.code || '—'}
                  </td>
                  <td className="font-semibold text-[var(--color-charcoal)]">
                    {item.securityName || item.script?.fullName || item.script?.shortName || '—'}
                  </td>
                  <td className="font-mono font-medium text-slate-500">
                    {item.script?.shortName || '—'}
                  </td>
                  <td className="font-semibold text-[var(--color-charcoal)] font-mono">
                    {getCurrencySymbol(item)}{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        <ClosingRateFormModal 
          initialData={editingItem} 
          exchanges={exchanges}
          scripts={scripts}
          onClose={() => setEditingItem(null)} 
        />
      )}
    </div>
  );
}
