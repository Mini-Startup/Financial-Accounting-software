'use client';

import { useMemo, useState } from 'react';
import { TradeFormModal } from './TradeFormModal';

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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Trades</h1>
          <p className="text-gray-500 mt-1">Create internal trades and instantly see client rate, broker rate, and profit.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsAdding(true)} className="btn-primary">
            + Add Trade
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/60">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Exchange</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Script</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Market</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client Rate</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Broker Rate</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400 font-medium">
                    No trades yet. Click “Add Trade” to calculate one.
                  </td>
                </tr>
              ) : null}
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.exchangeCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.scriptName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{r.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">₹{r.marketRate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.clientRate != null ? `₹${r.clientRate}` : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.brokerRate != null ? `₹${r.brokerRate}` : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    {r.profitTotal == null ? '-' : (
                      <span className={r.profitTotal > 0 ? 'text-green-700' : r.profitTotal < 0 ? 'text-red-700' : 'text-gray-700'}>
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

