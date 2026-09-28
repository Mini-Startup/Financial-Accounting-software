'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CurrencyFormModal } from './CurrencyFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { FindAndReplace } from '@/components/ui/FindAndReplace';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const CURRENCY_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'symbol', label: 'Symbol' },
];

export function CurrencyDataTable({ currencies: initialCurrencies }: { currencies: any[] }) {
  const router = useRouter();
  const [currenciesList, setCurrenciesList] = useState<any[]>(initialCurrencies);
  const [editingCurrency, setEditingCurrency] = useState<any | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('code');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useMemo(() => {
    setCurrenciesList(initialCurrencies);
  }, [initialCurrencies]);

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

  const filteredCurrencies = useMemo(() => {
    return filterRecordsWithAdvanced(currenciesList, searchQuery, searchColumn, advancedConditions);
  }, [currenciesList, searchQuery, searchColumn, advancedConditions]);

  const sortedCurrencies = useMemo(() => {
    return sortRecords(filteredCurrencies, sortKey, sortDir);
  }, [filteredCurrencies, sortKey, sortDir]);

  const paginatedCurrencies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCurrencies.slice(start, start + pageSize);
  }, [sortedCurrencies, currentPage, pageSize]);

  const activeCount = useMemo(() => {
    return paginatedCurrencies.filter((c) => c.isActive).length;
  }, [paginatedCurrencies]);

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedCurrencies[rowIndex];
    if (!target) return;
    setCurrenciesList((prev) =>
      prev.map((c) => (c.id === target.id ? { ...c, [columnKey]: newValue } : c))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(currenciesList, columnKey, findVal, replaceVal, true);
    setCurrenciesList(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/currencies/${deleteTargetId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Currency deactivated successfully');
        setDeleteTargetId(null);
        router.refresh();
      } else {
        throw new Error('Failed to deactivate currency');
      }
    } catch(e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to delete right now.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <div className="space-y-2">
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search currency code, name, or symbol..."
        columns={CURRENCY_COLUMNS}
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
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={sortedCurrencies.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50, 100]}
      />

      {isFindReplaceOpen && (
        <FindAndReplace
          data={paginatedCurrencies}
          columns={CURRENCY_COLUMNS}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={() => setIsFindReplaceOpen(false)}
        />
      )}

      <div className="card shadow-xs border border-t-0 border-slate-200 rounded-t-none bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
              <tr>
                <th
                  onClick={() => handleSort('code')}
                  className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4"
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
                  className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4"
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
                  onClick={() => handleSort('symbol')}
                  className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Symbol</span>
                    {sortKey === 'symbol' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('isActive')}
                  className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {sortKey === 'isActive' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCurrencies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--color-slate)] font-medium">
                    No currencies match search criteria.
                  </td>
                </tr>
              ) : null}
              {paginatedCurrencies.map((cur) => (
                <tr key={cur.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="font-mono font-bold text-[var(--color-charcoal)] py-2.5 px-4">{cur.code}</td>
                  <td className="text-[var(--color-slate)] py-2.5 px-4">{cur.name || '-'}</td>
                  <td className="text-[var(--color-charcoal)] font-semibold text-base py-2.5 px-4">{cur.symbol || '-'}</td>
                  <td className="py-2.5 px-4">
                    {cur.isActive ? (
                      <span className="badge badge--dot badge--success">Active</span>
                    ) : (
                      <span className="badge badge--dot badge--error">Inactive</span>
                    )}
                  </td>
                  <td className="text-right py-2.5 px-4">
                    <button 
                      onClick={() => setEditingCurrency(cur)}
                      className="text-[var(--color-forest)] hover:text-[var(--color-emerald)] mr-4 font-semibold transition text-xs cursor-pointer"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setDeleteTargetId(cur.id)}
                      className="text-[var(--color-negative)] hover:opacity-80 font-semibold transition text-xs cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="py-2.5 px-4">Total Currencies: {sortedCurrencies.length}</td>
                <td className="py-2.5 px-4 text-slate-500 font-normal">Active: {activeCount} | Inactive: {currenciesList.length - activeCount}</td>
                <td className="py-2.5 px-4" colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    {editingCurrency && (
      <CurrencyFormModal 
        initialData={editingCurrency} 
        onClose={() => setEditingCurrency(null)} 
      />
    )}

    <ConfirmDialog
      isOpen={!!deleteTargetId}
      title="Deactivate Currency"
      message="Are you sure you want to deactivate this currency?"
      variant="danger"
      confirmLabel="Deactivate"
      isLoading={isDeleting}
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTargetId(null)}
    />
    </>
  );
}
