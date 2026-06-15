'use client';

import { useState, useMemo } from 'react';
import { TradeFormModal } from './TradeFormModal';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

export function TradesPageManager({
  exchanges,
  accounts,
  scripts,
  initialTrades,
}: {
  exchanges: any[];
  accounts: any[];
  scripts: any[];
  initialTrades: any[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [trades, setTrades] = useState<any[]>(initialTrades);

  const clients = useMemo(() => accounts.filter(a => a.group?.name === 'Sundry Debtors'), [accounts]);
  const brokers = useMemo(() => accounts.filter(a => a.group?.name === 'Sundry Creditors'), [accounts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    try {
      const res = await fetch(`http://localhost:4000/trades/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTrades(prev => prev.filter(t => t.id !== id));
        toast.success('Trade deleted successfully');
      } else {
        toast.error('Failed to delete trade');
      }
    } catch {
      toast.error('Failed to delete trade');
    }
  };

  const handleSave = () => {
    window.location.reload(); // Hard reload to fetch updated list
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Trades</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Review manual and imported trade files cross-referenced with script exchange mappings.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsAdding(true)} className="btn btn--primary">
            + Add Trade
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card__body p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Trade No</th>
                <th>Exchange</th>
                <th>Script</th>
                <th>Buy/Sell</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th>Client</th>
                <th>Source</th>
                <th>Remarks</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-[var(--color-slate)] font-medium">
                    No trades found. Click "Add Trade" or use "Trade Import" to create some.
                  </td>
                </tr>
              ) : null}
              {trades.map(t => (
                <tr key={t.id}>
                  <td className="text-[var(--color-slate)] font-mono text-xs">
                    {new Date(t.tradeDate).toLocaleDateString()}
                  </td>
                  <td className="font-mono text-xs">{t.tradeNumber}</td>
                  <td className="font-bold text-[var(--color-charcoal)]">{t.exchange?.code || '—'}</td>
                  <td className="font-medium text-[var(--color-charcoal)]">{t.script?.fullName || '—'}</td>
                  <td>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                        t.transactionType === 'BUY'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      )}
                    >
                      {t.transactionType}
                    </span>
                  </td>
                  <td className="font-mono font-semibold text-right">{t.quantity}</td>
                  <td className="font-mono text-right">₹{t.rate.toFixed(2)}</td>
                  <td className="font-mono text-xs">{t.account?.code || '—'}</td>
                  <td>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                        t.source === 'MANUAL'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      )}
                    >
                      {t.source}
                    </span>
                  </td>
                  <td className="text-xs text-[var(--color-slate)] max-w-[150px] truncate" title={t.remarks}>
                    {t.remarks || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-right">
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-md hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <TradeFormModal
          exchanges={exchanges}
          scripts={scripts}
          clients={clients}
          brokers={brokers}
          onClose={() => setIsAdding(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
