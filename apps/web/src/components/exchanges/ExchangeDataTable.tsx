'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExchangeFormModal } from './ExchangeFormModal';
import { ExchangeDeleteModal } from './ExchangeDeleteModal';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { FindAndReplace } from '@/components/ui/FindAndReplace';
import { useOptimisticEntityList } from '@/hooks/useOptimisticEntityList';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const EXCHANGE_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
];

export function ExchangeDataTable({ exchanges: initialExchanges }: { exchanges: any[] }) {
  const router = useRouter();
  const {
    items: exchangesList,
    setItems: setExchangesList,
    addEntity,
    updateEntity,
    removeEntity,
    syncWithServer,
  } = useOptimisticEntityList<any>(initialExchanges);

  const [editingExchange, setEditingExchange] = useState<any | null>(null);
  const [deleteTargetExchange, setDeleteTargetExchange] = useState<any | null>(null);

  // Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('code');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    syncWithServer(initialExchanges);
  }, [initialExchanges, syncWithServer]);

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

  const filteredExchanges = useMemo(() => {
    return filterRecordsWithAdvanced(exchangesList, searchQuery, searchColumn, advancedConditions);
  }, [exchangesList, searchQuery, searchColumn, advancedConditions]);

  const sortedExchanges = useMemo(() => {
    return sortRecords(filteredExchanges, sortKey, sortDir);
  }, [filteredExchanges, sortKey, sortDir]);

  const paginatedExchanges = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedExchanges.slice(start, start + pageSize);
  }, [sortedExchanges, currentPage, pageSize]);

  const activeCount = useMemo(() => {
    return paginatedExchanges.filter((e) => e.isActive).length;
  }, [paginatedExchanges]);

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedExchanges[rowIndex];
    if (!target) return;
    setExchangesList((prev) =>
      prev.map((e) => (e.id === target.id ? { ...e, [columnKey]: newValue } : e))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(exchangesList, columnKey, findVal, replaceVal, true);
    setExchangesList(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

  return (
    <>
    <div className="border border-slate-200/90 rounded-2xl shadow-xs bg-white overflow-hidden relative">
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search exchange code or name..."
        columns={EXCHANGE_COLUMNS}
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
        totalItems={sortedExchanges.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50, 100]}
      />

      {isFindReplaceOpen && (
        <FindAndReplace
          data={paginatedExchanges}
          columns={EXCHANGE_COLUMNS}
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
                  <span>Exchange Code</span>
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
                  <span>Exchange Full Name</span>
                  {sortKey === 'name' ? (
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
            {paginatedExchanges.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                  No exchanges match search criteria.
                </td>
              </tr>
            ) : null}
            {paginatedExchanges.map((exc) => (
              <tr
                key={exc.id}
                onClick={() => setEditingExchange(exc)}
                className="hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                <td className="font-mono font-bold text-slate-900 py-3 px-4 text-xs">{exc.code}</td>
                <td className="text-slate-800 font-medium py-3 px-4 text-xs">{exc.name || '—'}</td>
                <td className="py-3 px-4">
                  {exc.isActive ? (
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
                    onClick={() => setEditingExchange(exc)}
                    className="text-[#2652C8] hover:text-[#1E42A8] mr-3 font-semibold transition text-xs cursor-pointer"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteTargetExchange(exc)}
                    className="text-rose-600 hover:text-rose-700 font-semibold transition text-xs cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Summary / Total Footer */}
          <tfoot className="border-t border-slate-200 bg-slate-50/80 font-medium text-xs text-slate-600">
            <tr>
              <td className="py-3 px-4 font-bold text-slate-700">Total Exchanges: {sortedExchanges.length}</td>
              <td className="py-3 px-4 text-slate-500 font-normal">Active: {activeCount} | Inactive: {exchangesList.length - activeCount}</td>
              <td className="py-3 px-4 text-right text-slate-500 font-normal" colSpan={2}>
                Page {currentPage} of {Math.max(1, Math.ceil(sortedExchanges.length / pageSize))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    {editingExchange && (
      <ExchangeFormModal 
        initialData={editingExchange} 
        onClose={() => setEditingExchange(null)} 
        onSuccess={(updated) => {
          if (updated) updateEntity(updated);
          setEditingExchange(null);
        }}
      />
    )}

    <ExchangeDeleteModal
      isOpen={!!deleteTargetExchange}
      exchange={deleteTargetExchange}
      onClose={() => setDeleteTargetExchange(null)}
      onDeleted={(deletedId) => {
        removeEntity(deletedId);
        setDeleteTargetExchange(null);
      }}
    />
    </>
  );
}
