'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FormModal } from './FormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function DataTable({
  accounts,
  groupName,
  entityLabel,
}: {
  accounts: any[];
  groupName: string;
  entityLabel: string;
}) {
  const router = useRouter();
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (a) =>
        (a.code || '').toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.mobileNumber || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  // Paginated accounts
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

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this specific record?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account-masters/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`${entityLabel} deleted successfully`);
        router.refresh();
      } else {
        toast.error('Failed to delete account');
      }
    } catch {
      toast.error('Failed to delete record');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to delete all ${count} selected records?`)) return;

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
      toast.success(`${count} records deleted successfully`);
      setSelectedIds(new Set());
      router.refresh();
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
        searchPlaceholder={`Search ${entityLabel.toLowerCase()}s by code, name, contact...`}
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
                <th style={{ width: '130px' }}>Code / ID</th>
                <th>Name</th>
                <th style={{ width: '140px' }} className="text-right">Opening Balance</th>
                <th>Contact</th>
                <th style={{ width: '90px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No {entityLabel.toLowerCase()}s found matching your search.
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
                    <td className="font-mono font-bold text-slate-800">
                      {acc.code || acc.id.substring(0, 8)}
                    </td>
                    <td className="font-medium text-slate-900">{acc.name}</td>
                    <td className="text-right font-mono font-bold">
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
                      {acc.mobileNumber || acc.whatsappNumber || acc.email || '—'}
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
                          onClick={() => handleDeleteSingle(acc.id)}
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

      {editingAccount && (
        <FormModal
          initialData={editingAccount}
          entityLabel={entityLabel}
          groupName={groupName}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
}
