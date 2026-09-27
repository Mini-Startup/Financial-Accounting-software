'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AccountMasterFormModal } from './AccountMasterFormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function AccountMasterPageManager({
  initialAccounts,
  groups,
}: {
  initialAccounts: any[];
  groups: any[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>(initialAccounts);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  // Search & Pagination & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search filter
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (a) =>
        (a.code || '').toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.group?.name || '').toLowerCase().includes(q) ||
        (a.mobileNumber || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.bankName || '').toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  // Paginated items
  const totalItems = filteredAccounts.length;
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  // Selection handlers
  const isAllVisibleSelected =
    paginatedAccounts.length > 0 &&
    paginatedAccounts.every((a) => selectedIds.has(a.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedAccounts.forEach((a) => next.delete(a.id));
      } else {
        paginatedAccounts.forEach((a) => next.add(a.id));
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
    if (!confirm('Are you sure you want to delete this account master?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccounts((prev) => prev.filter((acc) => acc.id !== id));
        toast.success('Account master deleted successfully');
      } else {
        toast.error('Failed to delete account master');
      }
    } catch {
      toast.error('Failed to delete account master');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to delete all ${count} selected account masters?`)) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters/${id}`, {
            method: 'DELETE',
          })
        )
      );
      setAccounts((prev) => prev.filter((acc) => !selectedIds.has(acc.id)));
      setSelectedIds(new Set());
      toast.success(`${count} account masters deleted successfully`);
    } catch {
      toast.error('Failed to delete some accounts');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = () => {
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-4">
        <div>
          <h1 className="text-h2 font-display">Account Master</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage standard and banking account masters.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn btn--primary">
          + Add Account Master
        </button>
      </div>

      {/* Top Controls Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search account masters by code, name, group, bank..."
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

      {/* Table Card */}
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
                <th style={{ width: '120px' }}>Code</th>
                <th>Name</th>
                <th style={{ width: '140px' }}>Group</th>
                <th style={{ width: '130px' }} className="text-right">Opening Bal</th>
                <th>Contact</th>
                <th>UPI / Bank Info</th>
                <th style={{ width: '90px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No account master entries found matching your search.
                  </td>
                </tr>
              ) : null}
              {paginatedAccounts.map((acc) => {
                const isSelected = selectedIds.has(acc.id);
                const opBal = Number(acc.openingBalance) || 0;
                return (
                  <tr
                    key={acc.id}
                    className={isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-slate-50/50'}
                  >
                    <td className="text-center">
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => handleToggleRow(acc.id)}
                      />
                    </td>
                    <td className="font-mono font-bold text-slate-800">{acc.code}</td>
                    <td className="font-medium text-slate-900">{acc.name}</td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {acc.group?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="text-right font-mono font-bold text-xs">
                      {opBal === 0 ? (
                        <span className="text-slate-400">₹0.00</span>
                      ) : opBal < 0 ? (
                        <span className="text-[var(--color-negative)]">
                          -₹{Math.abs(opBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Dr)
                        </span>
                      ) : (
                        <span className="text-[var(--color-forest)]">
                          +₹{opBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Cr)
                        </span>
                      )}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {acc.mobileNumber && <div>Mob: {acc.mobileNumber}</div>}
                      {acc.email && <div className="truncate max-w-[150px]">{acc.email}</div>}
                      {!acc.mobileNumber && !acc.email && '—'}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {acc.group?.name === 'Bank Accounts' ? (
                        <div>
                          {acc.bankName && (
                            <div className="font-medium text-slate-700">
                              {acc.bankName} - {acc.bankAccountNumber}
                            </div>
                          )}
                          {acc.upiId && <div className="font-mono text-emerald-700">UPI: {acc.upiId}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingAccount(acc)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-red-50"
                          title="Delete"
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

      {isAdding && (
        <AccountMasterFormModal
          groups={groups}
          onClose={() => setIsAdding(false)}
          onSave={handleSave}
        />
      )}

      {editingAccount && (
        <AccountMasterFormModal
          initialData={editingAccount}
          groups={groups}
          onClose={() => setEditingAccount(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
