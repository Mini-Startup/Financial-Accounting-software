'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClosingRateFormModal } from './ClosingRateFormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FindAndReplace } from '../ui/FindAndReplace';
import { toast } from 'sonner';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

const CLOSING_RATE_COLUMNS = [
  { key: 'rateDate', label: 'Date' },
  { key: 'exchange.code', label: 'Exchange' },
  { key: 'securityName', label: 'Security Name' },
  { key: 'script.shortName', label: 'Script' },
  { key: 'rate', label: 'Closing Rate' },
];

export function ClosingRateDataTable({
  closingRates: initialClosingRates,
  exchanges,
  scripts,
}: {
  closingRates: any[];
  exchanges: any[];
  scripts: any[];
}) {
  const router = useRouter();
  const [ratesList, setRatesList] = useState<any[]>(initialClosingRates);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('rateDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
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

  useMemo(() => {
    setRatesList(initialClosingRates);
  }, [initialClosingRates]);

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

  const formatDate = (dateString: string) => formatDateToDDMMYY(dateString);

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

  // Search filter with column targeting + advanced conditions
  const filteredRates = useMemo(() => {
    return filterRecordsWithAdvanced(ratesList, searchQuery, searchColumn, advancedConditions);
  }, [ratesList, searchQuery, searchColumn, advancedConditions]);

  // Sorted and Paginated items
  const sortedRates = useMemo(() => {
    return sortRecords(filteredRates, sortKey, sortDir);
  }, [filteredRates, sortKey, sortDir]);

  const totalItems = sortedRates.length;
  const paginatedRates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRates.slice(start, start + pageSize);
  }, [sortedRates, currentPage, pageSize]);

  const totalRateSum = useMemo(() => {
    return paginatedRates.reduce((sum, r) => sum + (Number(r.rate) || 0), 0);
  }, [paginatedRates]);

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedRates[rowIndex];
    if (!target) return;
    setRatesList((prev) =>
      prev.map((r) => (r.id === target.id ? { ...r, [columnKey]: newValue } : r))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(ratesList, columnKey, findVal, replaceVal, true);
    setRatesList(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

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

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Closing Rate',
      message: 'Are you sure you want to delete this closing rate?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/closing-rates/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            toast.success('Closing rate deleted');
            router.refresh();
          } else {
            toast.error('Failed to delete closing rate');
          }
        } catch {
          toast.error('Delete failed');
        }
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Closing Rates',
      message: `Are you sure you want to delete all ${count} selected closing rates?`,
      confirmLabel: `Delete ${count} Rates`,
      onConfirm: async () => {
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
          setSelectedIds(new Set());
          router.refresh();
        } catch {
          toast.error('Failed to delete some records');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <div className="space-y-2">
      {/* Top Controls Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search closing rates by security, exchange, date..."
        columns={CLOSING_RATE_COLUMNS}
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
          data={paginatedRates}
          columns={CLOSING_RATE_COLUMNS}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={() => setIsFindReplaceOpen(false)}
        />
      )}

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
                <th
                  style={{ width: '130px' }}
                  onClick={() => handleSort('rateDate')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {sortKey === 'rateDate' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  style={{ width: '100px' }}
                  onClick={() => handleSort('exchange.code')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Exchange</span>
                    {sortKey === 'exchange.code' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('securityName')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Security Name</span>
                    {sortKey === 'securityName' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  style={{ width: '140px' }}
                  onClick={() => handleSort('script.shortName')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Script</span>
                    {sortKey === 'script.shortName' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  style={{ width: '140px' }}
                  className="text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSort('rate')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Closing Rate</span>
                    {sortKey === 'rate' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
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
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="py-2.5 px-4 text-center" colSpan={4}>
                  Total Records: {totalItems} (Visible: {paginatedRates.length}) | Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-500 font-normal">
                  Sum of Rates:
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                  {totalRateSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-4"></td>
              </tr>
            </tfoot>
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
