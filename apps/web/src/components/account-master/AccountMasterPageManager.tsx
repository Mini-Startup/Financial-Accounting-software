'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccountMasterFormModal } from './AccountMasterFormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FindAndReplace } from '../ui/FindAndReplace';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';

const ACCOUNT_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Account Name' },
  { key: 'group.name', label: 'Group' },
  { key: 'openingBalance', label: 'Opening Balance' },
  { key: 'mobileNumber', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'bankName', label: 'Bank Name' },
];

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
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('code');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Sync state when initialAccounts updates
  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  // Global Ctrl+F / Cmd+F keyboard shortcut to toggle Find & Replace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFindReplaceOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Search filter with column targeting + advanced conditions
  const filteredAccounts = useMemo(() => {
    return filterRecordsWithAdvanced(accounts, searchQuery, searchColumn, advancedConditions);
  }, [accounts, searchQuery, searchColumn, advancedConditions]);

  // Sorted and Paginated items
  const sortedAccounts = useMemo(() => {
    return sortRecords(filteredAccounts, sortKey, sortDir);
  }, [filteredAccounts, sortKey, sortDir]);

  const totalItems = sortedAccounts.length;
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAccounts.slice(start, start + pageSize);
  }, [sortedAccounts, currentPage, pageSize]);

  const totalOpeningBalance = useMemo(() => {
    return paginatedAccounts.reduce((sum, a) => sum + (Number(a.openingBalance) || 0), 0);
  }, [paginatedAccounts]);

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedAccounts[rowIndex];
    if (!target) return;
    setAccounts((prev) =>
      prev.map((a) => (a.id === target.id ? { ...a, [columnKey]: newValue } : a))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(accounts, columnKey, findVal, replaceVal, true);
    setAccounts(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

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

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Account Master',
      message: 'Are you sure you want to delete this account master?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
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
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Account Masters',
      message: `Are you sure you want to delete all ${count} selected account masters?`,
      confirmLabel: `Delete ${count} Accounts`,
      onConfirm: async () => {
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
      },
    });
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
        columns={ACCOUNT_COLUMNS}
        searchColumn={searchColumn}
        onSearchColumnChange={(col) => {
          setSearchColumn(col);
          setCurrentPage(1);
        }}
        advancedConditions={advancedConditions}
        onAdvancedConditionsChange={(conds) => {
          setAdvancedConditions(conds);
          setCurrentPage(1);
        }}
        showFindReplaceButton={true}
        isFindReplaceOpen={isFindReplaceOpen}
        onToggleFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
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

      {/* Find & Replace Drawer */}
      {isFindReplaceOpen && (
        <FindAndReplace
          data={paginatedAccounts}
          columns={ACCOUNT_COLUMNS}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={() => setIsFindReplaceOpen(false)}
        />
      )}

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
                <th
                  style={{ width: '120px' }}
                  onClick={() => handleSort('code')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Code</span>
                    {sortKey === 'code' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    {sortKey === 'name' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  style={{ width: '140px' }}
                  onClick={() => handleSort('group.name')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Group</span>
                    {sortKey === 'group.name' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  style={{ width: '130px' }}
                  className="text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSort('openingBalance')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Opening Bal</span>
                    {sortKey === 'openingBalance' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
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
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="py-2.5 px-4 text-center" colSpan={4}>
                  Total Records: {totalItems} (Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))})
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">
                  {totalOpeningBalance === 0 ? (
                    <span className="text-slate-500">₹0.00</span>
                  ) : totalOpeningBalance < 0 ? (
                    <span className="text-[var(--color-negative)]">
                      -₹{Math.abs(totalOpeningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Dr)
                    </span>
                  ) : (
                    <span className="text-[var(--color-forest)]">
                      +₹{totalOpeningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Cr)
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4" colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isAdding && (
        <AccountMasterFormModal
          groups={groups}
          accounts={accounts}
          onClose={() => setIsAdding(false)}
          onSave={handleSave}
        />
      )}

      {editingAccount && (
        <AccountMasterFormModal
          initialData={editingAccount}
          groups={groups}
          accounts={accounts}
          onClose={() => setEditingAccount(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          await confirmDialog.onConfirm();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
