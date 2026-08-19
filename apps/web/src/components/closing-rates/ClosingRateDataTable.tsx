'use client';

import { useState, useMemo } from 'react';
import { ClosingRateFormModal } from './ClosingRateFormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClosingRateDataTable({
  closingRates,
  exchanges,
  scripts,
}: {
  closingRates: any[];
  exchanges: any[];
  scripts: any[];
}) {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);

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
    const matchingScript = scripts.find((s) => s.id === item.scriptId);
    if (matchingScript?.currency?.symbol) return matchingScript.currency.symbol;
    if (matchingScript?.currency?.code === 'INR') return '₹';
    return '$';
  };

  // Search filter
  const filteredRates = useMemo(() => {
    if (!searchQuery) return closingRates;
    const q = searchQuery.toLowerCase();
    return closingRates.filter(
      (r) =>
        (r.securityName || '').toLowerCase().includes(q) ||
        (r.script?.fullName || '').toLowerCase().includes(q) ||
        (r.script?.shortName || '').toLowerCase().includes(q) ||
        (r.exchange?.code || '').toLowerCase().includes(q) ||
        (r.rateDate || '').includes(q)
    );
  }, [closingRates, searchQuery]);

  // Paginated items
  const totalItems = filteredRates.length;
  const paginatedRates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRates.slice(start, start + pageSize);
  }, [filteredRates, currentPage, pageSize]);

  // Selection handlers
  const isAllVisibleSelected =
    paginatedRates.length > 0 &&
    paginatedRates.every((r) => selectedIds.has(r.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedRates.forEach((r) => next.delete(r.id));
      } else {
        paginatedRates.forEach((r) => next.add(r.id));
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
    if (!confirm('Are you sure you want to delete this closing rate?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Closing rate deleted');
        window.location.reload();
      } else {
        toast.error('Failed to delete closing rate');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to delete all ${count} selected closing rates?`)) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates/${id}`, {
            method: 'DELETE',
          })
        )
      );
      toast.success(`${count} closing rates deleted successfully`);
      window.location.reload();
    } catch {
      toast.error('Failed to delete some records');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* Top Controls Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search closing rates by security, exchange, date..."
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        isDeleting={isDeleting}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Main Table Card */}
      <div className="card shadow-xs border border-t-0 border-slate-200 rounded-t-none bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }} className="text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th style={{ width: '130px' }}>Date</th>
                <th style={{ width: '100px' }}>Exchange</th>
                <th>Security Name</th>
                <th style={{ width: '140px' }}>Script</th>
                <th style={{ width: '140px' }} className="text-right">Closing Rate</th>
                <th style={{ width: '90px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    No closing rates found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedRates.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-slate-50/50'}
                    >
                      <td className="text-center">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => handleToggleRow(item.id)}
                        />
                      </td>
                      <td className="font-mono font-medium text-slate-800">
                        {formatDate(item.rateDate)}
                      </td>
                      <td className="font-medium text-slate-800">
                        {item.exchange?.code || '—'}
                      </td>
                      <td className="font-semibold text-slate-900">
                        {item.securityName || item.script?.fullName || item.script?.shortName || '—'}
                      </td>
                      <td className="font-mono font-medium text-slate-500">
                        {item.script?.shortName || '—'}
                      </td>
                      <td className="font-semibold text-slate-900 font-mono text-right">
                        {getCurrencySymbol(item)}
                        {item.rate.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-slate-100"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
