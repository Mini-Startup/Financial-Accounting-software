'use client';

import { useMemo, useState } from 'react';
import { TradeFormModal } from './TradeFormModal';
import { cn } from '@/utils/cn';

type TradeRow = {
  id: string;
  date: string;
  exchangeCode: string;
  scriptName: string;
  quantity: number;
  marketRate: number;
  clientName: string;
  brokerName: string;
  clientRate?: number;
  brokerRate?: number;
  profitTotal?: number;
};

export function TradesPageManager({
  exchanges,
  accounts,
  scripts,
}: {
  exchanges: any[];
  accounts: any[];
  scripts: any[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [rows, setRows] = useState<TradeRow[]>([]);

  const clients = useMemo(
    () => accounts.filter(a => (a.group?.name || a.group?.fldGroupName) === 'Sundry Debtors'),
    [accounts]
  );
  const brokers = useMemo(
    () => accounts.filter(a => (a.group?.name || a.group?.fldGroupName) === 'Sundry Creditors'),
    [accounts]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Trades</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Create internal trades and instantly see client rate, broker rate, and profit.</p>
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
                <th>Exchange</th>
                <th>Script</th>
                <th>Qty</th>
                <th>Market</th>
                <th>Client Rate</th>
                <th>Broker Rate</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--color-slate)] font-medium">
                    No trades yet. Click "Add Trade" to calculate one.
                  </td>
                </tr>
              ) : null}
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="text-[var(--color-slate)]">{r.date}</td>
                  <td className="font-medium text-[var(--color-charcoal)]">{r.exchangeCode}</td>
                  <td className="font-medium text-[var(--color-charcoal)]">{r.scriptName}</td>
                  <td className="font-mono font-semibold text-[var(--color-charcoal)]">{r.quantity}</td>
                  <td className="font-mono text-[var(--color-slate)]">₹{r.marketRate}</td>
                  <td className="font-mono text-[var(--color-charcoal)]">{r.clientRate != null ? `₹${r.clientRate}` : '-'}</td>
                  <td className="font-mono text-[var(--color-charcoal)]">{r.brokerRate != null ? `₹${r.brokerRate}` : '-'}</td>
                  <td className="font-mono font-semibold">
                    {r.profitTotal == null ? '-' : (
                      <span className={r.profitTotal > 0 ? 'text-[var(--color-positive)]' : r.profitTotal < 0 ? 'text-[var(--color-negative)]' : 'text-[var(--color-charcoal)]'}>
                        {r.profitTotal > 0 ? '+' : ''}₹{r.profitTotal}
                      </span>
                    )}
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
          onSave={(row) => setRows(prev => [row, ...prev])}
        />
      )}
    </div>
  );
}
