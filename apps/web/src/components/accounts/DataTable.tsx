'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormModal } from './FormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { notify } from '@/utils/toastNotify';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FindAndReplace, type FindReplaceMatchState } from '../ui/FindAndReplace';
import { useOptimisticEntityList } from '@/hooks/useOptimisticEntityList';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { cn } from '@/utils/cn';
import { apiFetch } from '../../utils/apiClient';

const TABLE_COLUMNS = [
  { key: 'code', label: 'Code / ID', required: true },
  { key: 'name', label: 'Account Name', required: true },
  { key: 'openingBalance', label: 'Opening Balance' },
  { key: 'mobileNumber', label: 'Mobile Number' },
  { key: 'email', label: 'Email Address' },
  { key: 'bankName', label: 'Bank Name', isDefault: false },
  { key: 'ifscCode', label: 'IFSC Code', isDefault: false },
];

export function DataTable({
  accounts: initialAccounts,
  groupName,
  entityLabel,
  canEdit = true,
  canDelete = true,
}: {
  accounts: any[];
  groupName: string;
  entityLabel: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const {
    items: accountsList,
    setItems: setAccountsList,
    addEntity,
    updateEntity,
    removeEntity,
    syncWithServer,
  } = useOptimisticEntityList<any>(initialAccounts);

  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['ALL']);
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('code');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'code',
    'name',
    'openingBalance',
    'mobileNumber',
  ]);
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

  // Keep local list in sync with props
  useEffect(() => {
    syncWithServer(initialAccounts);
  }, [initialAccounts, syncWithServer]);

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

  // Filter accounts with column targeting + advanced conditions
  const filteredAccounts = useMemo(() => {
    return filterRecordsWithAdvanced(accountsList, searchQuery, searchColumn, advancedConditions, selectedColumns);
  }, [accountsList, searchQuery, searchColumn, advancedConditions, selectedColumns]);

  // Sorted and Paginated accounts
  const sortedAccounts = useMemo(() => {
    return sortRecords(filteredAccounts, sortKey, sortDir);
  }, [filteredAccounts, sortKey, sortDir]);

  const totalItems = sortedAccounts.length;
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAccounts.slice(start, start + pageSize);
  }, [sortedAccounts, currentPage, pageSize]);

  // Total calculated strictly on currently visible / filtered records
  const totalOpeningBalance = useMemo(() => {
    return paginatedAccounts.reduce((sum, a) => sum + (Number(a.openingBalance) || 0), 0);
  }, [paginatedAccounts]);

  const [findReplaceMatch, setFindReplaceMatch] = useState<FindReplaceMatchState | null>(null);

  // Find & Replace handlers
  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const targetRow = paginatedAccounts[rowIndex];
    if (!targetRow) return;
    setAccountsList((prev) =>
      prev.map((acc) => (acc.id === targetRow.id ? { ...acc, [columnKey]: newValue } : acc))
    );
    notify.success(`Replaced value in ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(accountsList, columnKey, findVal, replaceVal, true);
    setAccountsList(updatedRecords);
    notify.success(`Replaced ${count} occurrences in ${columnKey}`);
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

  const handleDeleteSingle = (id: string) => {
    if (!canDelete) {
      notify.error('Permission Denied', {
        description: 'You do not have permission to delete records.',
      });
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${entityLabel}`,
      message: 'Are you sure you want to delete this specific record?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/account-masters/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            removeEntity(id);
            notify.success(`${entityLabel} deleted successfully`);
          } else {
            const err = await res.json().catch(() => ({}));
            notify.error(err.message || 'Failed to delete account');
          }
        } catch (e: any) {
          notify.error(e.message || 'Failed to delete record');
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (!canDelete) {
      notify.error('Permission Denied', {
        description: 'You do not have permission to delete records.',
      });
      return;
    }
    const count = selectedIds.size;
    if (count === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete Selected ${entityLabel}s`,
      message: `Are you sure you want to delete all ${count} selected records?`,
      confirmLabel: `Delete ${count} Records`,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const ids = Array.from(selectedIds);
          let successCount = 0;
          for (const id of ids) {
            const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/account-masters/${id}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              removeEntity(id);
              successCount++;
            }
          }
          if (successCount > 0) {
            notify.success(`${successCount} records deleted successfully`);
          }
          setSelectedIds(new Set());
        } catch {
          notify.error('Failed to delete some records');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const renderWithDiff = (colKey: string, currentVal: any, isActiveMatch: boolean) => {
    const rawText = String(currentVal ?? '');
    if (!isActiveMatch || findReplaceMatch?.targetColumn !== colKey || !findReplaceMatch?.findText.trim()) {
      return currentVal;
    }
    const isReplaceActive = Boolean(findReplaceMatch.replaceText && findReplaceMatch.replaceText.trim().length > 0);
    if (!isReplaceActive) {
      return (
        <span className="bg-amber-200 text-amber-950 font-bold px-1.5 py-0.5 rounded shadow-2xs">
          {rawText || '—'}
        </span>
      );
    }
    let preview = rawText;
    try {
      const regex = new RegExp(findReplaceMatch.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      preview = rawText.replace(regex, findReplaceMatch.replaceText);
    } catch {
      preview = findReplaceMatch.replaceText;
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs">
        <span className="line-through text-red-600 bg-red-50 px-1 py-0.5 rounded opacity-75">{rawText || '—'}</span>
        <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold shadow-2xs">→ {preview}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Seamless Table Container with Zero Gap between Toolbar and Grid */}
      <div className="border border-border-light rounded-xl shadow-xs bg-white relative">
        <TableToolbar
          tableName={entityLabel === 'Broker' ? 'Brokers' : 'Clients'}
          records={accountsList}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder={`Search ${entityLabel.toLowerCase()}s by code, name, contact...`}
          columns={TABLE_COLUMNS}
          searchColumn={searchColumn}
          onSearchColumnChange={(col) => {
            setSearchColumn(col);
            setCurrentPage(1);
          }}
          selectedColumns={selectedColumns}
          onSelectedColumnsChange={(cols) => {
            setSelectedColumns(cols);
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
          onBulkDelete={canDelete ? handleBulkDelete : undefined}
          onClearSelection={() => setSelectedIds(new Set())}
          isDeleting={isDeleting}
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          columnSettings={{
            columns: TABLE_COLUMNS,
            visibleColumns,
            onChange: setVisibleColumns,
            storageKey: `bizzmate_cols_accounts_${groupName}`,
          }}
          className="border-0 rounded-none border-b border-border-light"
        />

        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr>
                <th style={{ width: '40px' }} className="text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th
                  style={{ width: '130px' }}
                  onClick={() => handleSort('code')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Code / ID</span>
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
                  style={{ width: '160px' }}
                  className="text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSort('openingBalance')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Opening Balance</span>
                    {sortKey === 'openingBalance' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
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
              {paginatedAccounts.map((acc, index) => {
                const isSelected = selectedIds.has(acc.id);
                const opBal = Number(acc.openingBalance) || 0;
                const isMatched = findReplaceMatch?.matchedRowIndices.includes(index);
                const isActiveMatch = findReplaceMatch?.activeRowIndex === index;

                return (
                  <tr
                    key={acc.id}
                    ref={(el) => {
                      if (isActiveMatch && el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                    onClick={() => canEdit && setEditingAccount(acc)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected && 'bg-emerald-50/40 hover:bg-emerald-50/60',
                      !isSelected && isMatched && !isActiveMatch && 'bg-amber-50/60 hover:bg-amber-100/60',
                      isActiveMatch && 'bg-amber-100/90 ring-2 ring-amber-400 font-semibold shadow-xs',
                      !isSelected && !isMatched && !isActiveMatch && 'hover:bg-slate-50/70'
                    )}
                  >
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => handleToggleRow(acc.id)}
                      />
                    </td>
                    <td className="font-mono font-bold text-slate-800">
                      {renderWithDiff('code', acc.code || acc.id.substring(0, 8), isActiveMatch)}
                    </td>
                    <td className="font-medium text-slate-900">
                      {renderWithDiff('name', acc.name, isActiveMatch)}
                    </td>
                    <td className="text-right font-mono font-bold">
                      {opBal === 0 ? (
                        <span className="text-slate-400">₹0.00</span>
                      ) : opBal < 0 ? (
                        <span className="text-negative">
                          -₹{Math.abs(opBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Dr)
                        </span>
                      ) : (
                        <span className="text-(--color-forest)">
                          +₹{opBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Cr)
                        </span>
                      )}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {renderWithDiff('mobileNumber', acc.mobileNumber || acc.whatsappNumber || acc.email || '—', isActiveMatch)}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            onClick={() => setEditingAccount(acc)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSingle(acc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="py-2.5 px-4 text-center" colSpan={3}>
                  Total Records: {totalItems} (Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))})
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">
                  {totalOpeningBalance === 0 ? (
                    <span className="text-slate-500">₹0.00</span>
                  ) : totalOpeningBalance < 0 ? (
                    <span className="text-negative">
                      -₹{Math.abs(totalOpeningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Dr)
                    </span>
                  ) : (
                    <span className="text-(--color-forest)">
                      +₹{totalOpeningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Cr)
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Floating Find & Replace Overlay Widget */}
      {isFindReplaceOpen && (
        <FindAndReplace
          data={paginatedAccounts}
          columns={TABLE_COLUMNS}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={() => {
            setIsFindReplaceOpen(false);
            setFindReplaceMatch(null);
          }}
          onMatchChange={setFindReplaceMatch}
        />
      )}

      {editingAccount && (
        <FormModal
          initialData={editingAccount}
          entityLabel={entityLabel}
          groupName={groupName}
          accounts={accountsList}
          onClose={() => setEditingAccount(null)}
          onSuccess={(saved) => {
            if (saved) {
              updateEntity(saved);
            }
            setEditingAccount(null);
          }}
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
