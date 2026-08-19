'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TradeFormModal } from './TradeFormModal';
import { TradeImportManager } from './TradeImportManager';
import { TradeDetailModal } from './TradeDetailModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { Trash2, Plus, UploadCloud, Pencil } from 'lucide-react';
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
  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const [trades, setTrades] = useState<any[]>(initialTrades);
  const [selectedTrade, setSelectedTrade] = useState<any | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state with query parameters (e.g. sidebar links)
  useEffect(() => {
    setViewMode(isImportParam ? 'import' : 'list');
  }, [isImportParam]);

  // Update local trades list when initialTrades changes
  useEffect(() => {
    setTrades(initialTrades);
  }, [initialTrades]);

  const clients = useMemo(() => accounts.filter((a) => a.group?.name === 'Sundry Debtors'), [accounts]);
  const brokers = useMemo(() => accounts.filter((a) => a.group?.name === 'Sundry Creditors'), [accounts]);

  // Filter trades list
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (t.tradeNumber || '').toLowerCase().includes(q) ||
        (t.securityName || '').toLowerCase().includes(q) ||
        (t.script?.fullName || '').toLowerCase().includes(q) ||
        (t.script?.shortName || '').toLowerCase().includes(q) ||
        (t.account?.code || '').toLowerCase().includes(q) ||
        (t.account?.name || '').toLowerCase().includes(q) ||
        (t.broker?.code || '').toLowerCase().includes(q) ||
        (t.broker?.name || '').toLowerCase().includes(q) ||
        (t.terminal || '').toLowerCase().includes(q) ||
        (t.remarks || '').toLowerCase().includes(q);

      const matchesExchange = !exchangeFilter || t.exchange?.code === exchangeFilter;
      const matchesType = !typeFilter || t.transactionType === typeFilter;

      return matchesSearch && matchesExchange && matchesType;
    });
  }, [trades, searchQuery, exchangeFilter, typeFilter]);

  // Paginated trades
  const totalItems = filteredTrades.length;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  // Selection handlers
  const isAllVisibleSelected =
    paginatedTrades.length > 0 &&
    paginatedTrades.every((t) => selectedIds.has(t.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedTrades.forEach((t) => next.delete(t.id));
      } else {
        paginatedTrades.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTrades((prev) => prev.filter((t) => t.id !== id));
        toast.success('Trade deleted successfully');
      } else {
        toast.error('Failed to delete trade');
      }
    } catch {
      toast.error('Failed to delete trade');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to delete all ${count} selected trades?`)) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${id}`, {
            method: 'DELETE',
          })
        )
      );
      setTrades((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      toast.success(`${count} trades deleted successfully`);
    } catch {
      toast.error('Failed to delete some trades');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = () => {
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

  if (viewMode === 'import') {
    return <TradeImportManager onBack={handleImportBack} />;
  }

  return (
    <div className="space-y-4 relative">
      {isDeleting && <LoadingOverlay message="Deleting selected trades..." />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-4">
        <div>
          <h1 className="text-h2 font-display">Trades</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Review manual, imported, and settlement trades cross-referenced with account masters.
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

      {/* Top Table Toolbar with Pagination */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search trades by security, client, broker, terminal..."
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        isDeleting={isDeleting}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[25, 50, 100, 200]}
        filterSlot={
          <div className="flex gap-2">
            <select
              value={exchangeFilter}
              onChange={(e) => {
                setExchangeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="input text-xs py-1.5 w-32 bg-white"
            >
              <option value="">All Exchanges</option>
              {exchanges.map((ex) => (
                <option key={ex.id} value={ex.code}>
                  {ex.code}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="input text-xs py-1.5 w-28 bg-white"
            >
              <option value="">Buy / Sell</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        }
      />

      {/* Table List Card */}
      <div className="card shadow-xs border border-t-0 border-slate-200 rounded-t-none bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr className="whitespace-nowrap">
                <th style={{ width: '40px' }} className="text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th>Date</th>
                <th>Exchange</th>
                <th>Security Name / Script</th>
                <th>Expiry Date</th>
                <th>Type</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th>Client</th>
                <th>Broker</th>
                <th className="text-right">Client Rate</th>
                <th className="text-right">Broker Rate</th>
                <th className="text-right">Profit</th>
                <th>Trade Type</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-[var(--color-slate)] font-medium">
                    No trades match your search criteria.
                  </td>
                </tr>
              ) : null}
              {paginatedTrades.map((t) => {
                const profit = t.profitTotal ?? 0;
                const secName = t.securityName || t.script?.fullName || t.script?.shortName || '—';
                const isSelected = selectedIds.has(t.id);
                
                // Dynamic currency symbol resolution
                const currSym = t.script?.currency?.symbol || (
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'INR' ? '₹' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'USD' ? '$' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'AED' ? 'AED ' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'EUR' ? '€' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'GBP' ? '£' :
                  (t.currencyCode ? `${t.currencyCode} ` : '$')
                );

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTrade(t)}
                    className={cn(
                      'hover:bg-slate-50 transition-colors cursor-pointer select-none whitespace-nowrap',
                      isSelected && 'bg-emerald-50/40 hover:bg-emerald-50/60'
                    )}
                    title="Click to view full details"
                  >
                    <td
                      className="text-center whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRow(t.id);
                      }}
                    >
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => handleToggleRow(t.id)}
                      />
                    </td>
                    <td className="text-[var(--color-slate)] font-mono text-xs whitespace-nowrap">
                      {new Date(t.tradeDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="font-bold text-[var(--color-charcoal)] whitespace-nowrap">{t.exchange?.code || '—'}</td>
                    <td className="max-w-[260px] truncate whitespace-nowrap" title={secName}>
                      <span className="font-semibold text-[var(--color-charcoal)] text-xs truncate block">{secName}</span>
                    </td>
                    <td className="font-mono text-xs text-slate-700 whitespace-nowrap">
                      {t.expiry || '—'}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap',
                          t.transactionType === 'BUY'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        )}
                      >
                        {t.transactionType}
                      </span>
                    </td>
                    <td className="font-mono font-semibold text-right whitespace-nowrap">{t.quantity}</td>
                    <td className="font-mono text-right text-xs whitespace-nowrap">{currSym}{t.rate.toFixed(2)}</td>
                    <td className="font-mono text-xs whitespace-nowrap" title={t.account?.name}>{t.account?.code || '—'}</td>
                    <td className="font-mono text-xs whitespace-nowrap" title={t.broker?.name}>{t.broker?.code || '—'}</td>
                    <td className="font-mono text-right text-xs whitespace-nowrap">
                      {t.clientRate != null ? `${currSym}${t.clientRate.toFixed(2)}` : '—'}
                    </td>
                    <td className="font-mono text-right text-xs whitespace-nowrap">
                      {t.brokerRate != null ? `${currSym}${t.brokerRate.toFixed(2)}` : '—'}
                    </td>
                    <td
                      className={cn(
                        'font-mono font-bold text-right text-xs whitespace-nowrap',
                        profit > 0 ? 'text-[var(--color-positive)]' :
                        profit < 0 ? 'text-[var(--color-negative)]' :
                        'text-[var(--color-charcoal)]'
                      )}
                    >
                      {profit > 0 ? '+' : ''}{currSym}{profit.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap',
                          t.tradeType === 'CARRY_FORWARD' && 'bg-amber-50 text-amber-800 border-amber-200',
                          t.tradeType === 'BACK_FORWARD' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
                          t.tradeType === 'SETTLEMENT' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                          (!t.tradeType || t.tradeType === 'REGULAR') &&
                            (t.source === 'MANUAL'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200')
                        )}
                      >
                        {t.tradeType && t.tradeType !== 'REGULAR' ? t.tradeType : t.source}
                      </span>
                    </td>
                    <td
                      className="text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingTrade(t)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50 cursor-pointer"
                          title="Edit Trade"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-md hover:bg-red-50 cursor-pointer"
                          title="Delete Trade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Edit Form Modal */}
      {editingTrade && (
        <TradeFormModal
          exchanges={exchanges}
          scripts={scripts}
          clients={clients}
          brokers={brokers}
          initialTrade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSave={handleSave}
        />
      )}

      {/* Detail Modal Popup */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onEdit={() => setEditingTrade(selectedTrade)}
        />
      )}
    </div>
  );
}
