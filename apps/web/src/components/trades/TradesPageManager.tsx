'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TradeFormModal } from './TradeFormModal';
import { TradeImportManager } from './TradeImportManager';
import { TradeDetailModal } from './TradeDetailModal';
import { Trash2, Search, Plus, UploadCloud, ArrowLeft, TrendingUp } from 'lucide-react';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImportParam = searchParams.get('import') === 'true';

  const [viewMode, setViewMode] = useState<'list' | 'import'>(isImportParam ? 'import' : 'list');
  const [isAdding, setIsAdding] = useState(false);
  const [trades, setTrades] = useState<any[]>(initialTrades);
  const [selectedTrade, setSelectedTrade] = useState<any | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Sync state with query parameters (e.g. sidebar links)
  useEffect(() => {
    setViewMode(isImportParam ? 'import' : 'list');
  }, [isImportParam]);

  // Update local trades list when initialTrades changes (e.g. on router refresh)
  useEffect(() => {
    setTrades(initialTrades);
  }, [initialTrades]);

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
    // Refresh the router data and stay on listing page
    router.refresh();
    toast.success('Trades list refreshed');
  };

  const handleImportBack = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('import');
    window.history.pushState({}, '', url.toString());
    setViewMode('list');
    router.refresh();
  };

  // Filter trades list
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.tradeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.script?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.script?.shortName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.account?.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.account?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.terminal || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.remarks || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesExchange = !exchangeFilter || t.exchange?.code === exchangeFilter;
      const matchesType = !typeFilter || t.transactionType === typeFilter;

      return matchesSearch && matchesExchange && matchesType;
    });
  }, [trades, searchQuery, exchangeFilter, typeFilter]);

  if (viewMode === 'import') {
    return <TradeImportManager onBack={handleImportBack} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6">
        <div>
          <h1 className="text-h2 font-display">Trades</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Review manual and imported trade files cross-referenced with script exchange mappings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(true)}
            className="btn btn--primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Trade
          </button>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('import', 'true');
              window.history.pushState({}, '', url.toString());
              setViewMode('import');
            }}
            className="btn btn--secondary flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-[var(--color-primary)]" /> Import File
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--color-fog)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trades by script name, client code, terminal, remarks..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              className="input w-36"
            >
              <option value="">Exchanges</option>
              {exchanges.map((ex) => (
                <option key={ex.id} value={ex.code}>
                  {ex.code}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-32"
            >
              <option value="">Buy/Sell</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table List Card */}
      <div className="card">
        <div className="card__body p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Trade No</th>
                <th>Exchange</th>
                <th>Script</th>
                <th>BS</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th>Client</th>
                <th>Broker</th>
                <th className="text-right">Client Rate</th>
                <th className="text-right">Broker Rate</th>
                <th className="text-right">Profit</th>
                <th>Source</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-[var(--color-slate)] font-medium">
                    No trades match your filter criteria. Click "Add Trade" or "Import File" to record some.
                  </td>
                </tr>
              ) : null}
              {filteredTrades.map(t => {
                const profit = t.profitTotal ?? 0;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTrade(t)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer select-none"
                    title="Click to view full details"
                  >
                    <td className="text-[var(--color-slate)] font-mono text-xs">
                      {new Date(t.tradeDate).toLocaleDateString()}
                    </td>
                    <td className="font-mono text-xs">{t.tradeNumber}</td>
                    <td className="font-bold text-[var(--color-charcoal)]">{t.exchange?.code || '—'}</td>
                    <td className="font-semibold text-[var(--color-charcoal)]">
                      {t.script?.fullName || t.script?.shortName || '—'}
                    </td>
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
                    <td className="font-mono text-right text-xs">₹{t.rate.toFixed(2)}</td>
                    <td className="font-mono text-xs" title={t.account?.name}>{t.account?.code || '—'}</td>
                    <td className="font-mono text-xs" title={t.broker?.name}>{t.broker?.code || '—'}</td>
                    <td className="font-mono text-right text-xs">
                      {t.clientRate != null ? `₹${t.clientRate.toFixed(2)}` : '—'}
                    </td>
                    <td className="font-mono text-right text-xs">
                      {t.brokerRate != null ? `₹${t.brokerRate.toFixed(2)}` : '—'}
                    </td>
                    <td
                      className={cn(
                        'font-mono font-bold text-right text-xs',
                        profit > 0 ? 'text-[var(--color-positive)]' :
                        profit < 0 ? 'text-[var(--color-negative)]' :
                        'text-[var(--color-charcoal)]'
                      )}
                    >
                      {profit > 0 ? '+' : ''}₹{profit.toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
                          t.source === 'MANUAL'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        )}
                      >
                        {t.source}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-md hover:bg-red-50"
                        title="Delete Trade"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Form Modal */}
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

      {/* Detail Modal Popup */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </div>
  );
}
