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
    <div className="border border-slate-200/90 rounded-2xl shadow-xs bg-white overflow-hidden relative">
      <TableToolbar
        tableName="Currencies"
        records={currenciesList}
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

      <div className="overflow-x-auto">
        <table className="data-table w-full text-xs">
          <thead className="bg-slate-50/90 border-b border-slate-200/80 select-none">
            <tr className="whitespace-nowrap">
              <th
                onClick={() => handleSort('code')}
                className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Currency Code</span>
                  {sortKey === 'code' ? (
                    sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2652C8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2652C8]" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Currency Name</span>
                  {sortKey === 'name' ? (
                    sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2652C8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2652C8]" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('symbol')}
                className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Symbol</span>
                  {sortKey === 'symbol' ? (
                    sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2652C8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2652C8]" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('isActive')}
                className="cursor-pointer hover:bg-slate-100 select-none py-3 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {sortKey === 'isActive' ? (
                    sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2652C8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2652C8]" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="text-right py-3 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedCurrencies.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                  No currencies match search criteria.
                </td>
              </tr>
            ) : null}
            {paginatedCurrencies.map((cur) => (
              <tr
                key={cur.id}
                onClick={() => setEditingCurrency(cur)}
                className="hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                <td className="font-mono font-bold text-slate-900 py-3 px-4 text-xs">{cur.code}</td>
                <td className="text-slate-800 font-medium py-3 px-4 text-xs">{cur.name || '—'}</td>
                <td className="text-slate-900 font-semibold text-sm py-3 px-4">{cur.symbol || '—'}</td>
                <td className="py-3 px-4">
                  {cur.isActive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/80">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => setEditingCurrency(cur)}
                    className="text-[#2652C8] hover:text-[#1E42A8] mr-3 font-semibold transition text-xs cursor-pointer"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteTargetId(cur.id)}
                    className="text-rose-600 hover:text-rose-700 font-semibold transition text-xs cursor-pointer"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Summary / Total Footer */}
          <tfoot className="border-t border-slate-200 bg-slate-50/80 font-medium text-xs text-slate-600">
            <tr>
              <td className="py-3 px-4 font-bold text-slate-700" colSpan={2}>Total Currencies: {sortedCurrencies.length}</td>
              <td className="py-3 px-4 text-slate-500 font-normal">Active: {activeCount} | Inactive: {currenciesList.length - activeCount}</td>
              <td className="py-3 px-4 text-right text-slate-500 font-normal" colSpan={2}>
                Page {currentPage} of {Math.max(1, Math.ceil(sortedCurrencies.length / pageSize))}
              </td>
            </tr>
          </tfoot>
        </table>
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
